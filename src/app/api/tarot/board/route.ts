import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBoardMessages, postBoardMessage, tarotDateNow } from "@/lib/tarot-db";

export const dynamic = "force-dynamic";

/** 读取某一天的塔罗公共留言板（默认今天；可按 ?date=YYYY-MM-DD 及 ?user= 查询） */
export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date") ?? tarotDateNow();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "日期格式不正确" }, { status: 400 });
    }
    const messages = await getBoardMessages(date, 120);
    return NextResponse.json({ date, messages });
  } catch (err) {
    console.error("[塔罗留言板] 读取失败:", err);
    return NextResponse.json({ error: (err as Error).message || "读取留言板失败" }, { status: 500 });
  }
}

/** 在当天留言板发布一条留言（需登录） */
export async function POST(req: NextRequest) {
  const actor = await getCurrentUser(req);
  if (!actor) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const content = (body.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "留言内容不能为空" }, { status: 400 });
  if (content.length > 200) return NextResponse.json({ error: "留言过长（最多 200 字）" }, { status: 400 });

  const today = tarotDateNow();
  try {
    const message = await postBoardMessage(actor.id, today, content);
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    console.error("[塔罗留言板] 发布失败:", err);
    return NextResponse.json({ error: (err as Error).message || "发布留言失败" }, { status: 500 });
  }
}