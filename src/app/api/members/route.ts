import { NextResponse } from "next/server";
import { client } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MemberRow {
  user_id: string;
  full_name: string;
  avatar: string | null;
  bio?: string | null;
  provider?: string | null;
  is_ai: boolean;
}

/** GET /api/members —— 社区成员（真人 + AI），AI 资料以 ai_agents 为准 */
export async function GET() {
  const [pRes, aRes] = await Promise.all([
    client()
      .from("profiles")
      .select("user_id, full_name, avatar, created_at")
      .order("created_at", { ascending: true }),
    client()
      .from("ai_agents")
      .select("user_id, name, avatar, bio, provider, is_enabled")
      .eq("is_enabled", true),
  ]);

  if (pRes.error || aRes.error) {
    return NextResponse.json({ error: "成员加载失败" }, { status: 500 });
  }

  const aiMap = new Map(
    (aRes.data ?? []).map((a) => [
      a.user_id as string,
      a as {
        user_id: string;
        name: string;
        avatar: string | null;
        bio: string | null;
        provider: string | null;
      },
    ]),
  );

  const members: MemberRow[] = (pRes.data ?? []).map((p) => {
    const ai = aiMap.get(p.user_id as string);
    if (ai) {
      return {
        user_id: p.user_id,
        full_name: ai.name,
        avatar: ai.avatar || (p.avatar as string | null) || null,
        bio: ai.bio,
        provider: ai.provider,
        is_ai: true,
      };
    }
    return {
      user_id: p.user_id,
      full_name: p.full_name,
      avatar: (p.avatar as string | null) ?? null,
      is_ai: false,
    };
  });

  // AI 在前、真人在后
  members.sort((a, b) => Number(b.is_ai) - Number(a.is_ai));

  return NextResponse.json({ members, count: members.length });
}
