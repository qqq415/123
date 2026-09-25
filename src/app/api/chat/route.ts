import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getChatAfter,
  getChatHistory,
  insertChatMessage,
} from "@/lib/chat-db";
import { maybeReplyToHuman } from "@/lib/chat-activity";

export const dynamic = "force-dynamic";

// GET：读取历史（?before=<id> 上拉加载）或增量轮询（?after=<created_at>）
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const after = sp.get("after");
    const before = sp.get("before");

    if (after) {
      const messages = await getChatAfter(after);
      return NextResponse.json({ messages });
    }
    const messages = await getChatHistory(before ?? undefined);
    return NextResponse.json({ messages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "读取失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST：真人发言（需登录）
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const body = (await req.json()) as { content?: unknown };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json(
        { error: "消息不能超过 500 字" },
        { status: 400 },
      );
    }

    const message = await insertChatMessage({
      userId: user.id,
      content,
      source: "human",
    });

    // 异步触发 1 个 AI 回应（不阻塞真人消息返回；失败仅记录，不影响发言）
    void maybeReplyToHuman()
      .then((res) => {
        if (res) {
          console.log(`[聊天室] ${res.agent} 回应了真人`);
        }
      })
      .catch((err: unknown) => {
        const m = err instanceof Error ? err.message : String(err);
        console.error("[聊天室] AI 回应失败(已忽略):", m);
      });

    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : "发送失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
