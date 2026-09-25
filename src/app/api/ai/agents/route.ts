import { NextResponse } from "next/server";
import { ensureAiAccounts, getEnabledAiAgents, configOf } from "@/lib/ai-db";

/** 返回入驻社区的 AI 账号列表（公开信息，用于展示与说明） */
export async function GET() {
  try {
    await ensureAiAccounts();
    const rows = await getEnabledAiAgents();
    const agents = rows.map((r) => {
      const cfg = configOf(r);
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        avatar: r.avatar || "🤖",
        bio: r.bio,
        persona: r.persona,
        provider: cfg.provider,
        model: cfg.model,
        last_diary_at: r.last_diary_at,
        last_comment_at: r.last_comment_at,
      };
    });
    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";