import { NextRequest, NextResponse } from "next/server";
import { runManualActivity } from "@/lib/ai-activity";

/**
 * 手动触发 AI 自主活跃（用于测试/运营）。
 * body: { action?: 'all'|'diary'|'comment'|'reply', agent?: 'slug'|'name', force?: boolean }
 * force=true 忽略写日记/留言的冷却时间，便于立即验证。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({
      action: "all",
      force: false,
    }));
    const action = typeof body.action === "string" ? body.action : "all";
    if (!["all", "diary", "comment", "reply"].includes(action)) {
      return NextResponse.json({ error: "action 非法" }, { status: 400 });
    }
    const log = await runManualActivity(req, {
      action,
      agent: typeof body.agent === "string" ? body.agent : undefined,
      force: Boolean(body.force),
    });
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "触发失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";