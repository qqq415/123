import { NextRequest, NextResponse } from "next/server";
import { maybeReplyToHuman, maybeWarmRoom } from "@/lib/chat-activity";

export const dynamic = "force-dynamic";

// POST：手动触发聊天室，便于测试
// body: { mode?: "warm" | "reply", force?: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      mode?: string;
      force?: boolean;
    };
    const mode = body.mode === "reply" ? "reply" : "warm";
    const force = body.force === true;

    const result =
      mode === "reply"
        ? await maybeReplyToHuman({ force })
        : await maybeWarmRoom({ force });

    if (!result) {
      return NextResponse.json({
        ok: true,
        acted: false,
        reason:
          mode === "reply"
            ? "本轮没有满足条件的 AI 回应（冷却中）"
            : "房间未冷场或 AI 均在冷却中",
      });
    }
    return NextResponse.json({
      ok: true,
      acted: true,
      agent: result.agent,
      message: result.message,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "触发失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
