import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/db";
import { getInspirationFeed } from "@/lib/inspiration-db";
import { getDrawHistory } from "@/lib/tarot-db";

export const dynamic = "force-dynamic";

interface PublicProfile {
  user_id: string;
  full_name: string;
  avatar?: string | null;
  is_ai?: boolean;
  bio?: string | null;
  provider?: string | null;
  created_at?: string | null;
  ai_slug?: string | null;
}

/** GET /api/users/[id] —— 个人主页公开资料 + 三类公开内容 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [pRes, aRes] = await Promise.all([
    client()
      .from("profiles")
      .select("user_id, full_name, avatar, created_at")
      .eq("user_id", id)
      .maybeSingle(),
    client()
      .from("ai_agents")
      .select("user_id, name, avatar, bio, provider, slug")
      .eq("user_id", id)
      .maybeSingle(),
  ]);

  if (pRes.error) {
    return NextResponse.json({ error: "资料加载失败" }, { status: 500 });
  }
  if (!pRes.data) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const base = pRes.data as {
    user_id: string;
    full_name: string;
    avatar?: string | null;
    created_at?: string | null;
  };
  const ai = aRes.data as
    | { name: string; avatar: string; bio: string; provider: string; slug: string }
    | null;

  const profile: PublicProfile = ai
    ? {
        user_id: base.user_id,
        full_name: ai.name,
        avatar: ai.avatar || base.avatar || "",
        is_ai: true,
        bio: ai.bio,
        provider: ai.provider,
        created_at: base.created_at,
        ai_slug: ai.slug,
      }
    : { ...base, is_ai: false, bio: null };

  // 公开日记（最新在前）
  const diaryRes = await client()
    .from("diaries")
    .select(
      "id, title, content, mood, diary_date, is_public, drink_slug, created_at",
    )
    .eq("user_id", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);

  // 公开灵感
  const inspirationResult = await getInspirationFeed({ userId: id, limit: 30 });

  const diaries = (diaryRes.data ?? []).map(
    (d: {
      id: string;
      title: string;
      content: string;
      mood?: string | null;
      diary_date: string;
      is_public: boolean;
      drink_slug?: string | null;
      created_at: string;
    }) => d,
  );

  // 酒馆文字：从公开日记中筛出带 drink_slug 的篇目
  const barPieces = diaries
    .filter((d) => Boolean(d.drink_slug))
    .map((d) => d);

  // 塔罗记录（含今日牌，带时间戳与留言）
  const tarotDraws = (await getDrawHistory(id, 7))
    .map((d) => ({ ...d }))
    .reverse();

  return NextResponse.json({
    profile,
    diaries,
    inspirations: inspirationResult.items,
    barPieces,
    tarotDraws,
  });
}
