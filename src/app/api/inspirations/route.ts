import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  countTodayInspirations,
  DAILY_INSPIRATION_LIMIT,
  getInspirationFeed,
  insertInspiration,
  MAX_INSPIRATION_CHARS,
} from "@/lib/inspiration-db";

// 使用东八区日期作为“今天”，保证日上限按用户本地日期计算
function todayInShanghai(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitRaw = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 30;

    const result = await getInspirationFeed({ limit, cursor, userId });

    // 附带当前用户今日剩余条数（登录时）
    const user = await getCurrentUser(req);
    let remaining: number | null = null;
    if (user) {
      const date = todayInShanghai();
      remaining = DAILY_INSPIRATION_LIMIT - (await countTodayInspirations(user.id, date));
    }
    return NextResponse.json({ ...result, dailyLimit: DAILY_INSPIRATION_LIMIT, remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : "灵感加载失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录后再记录灵感" }, { status: 401 });
    }

    const body = (await req.json()) as { content?: unknown };
    const content = String(body.content ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "灵感不能为空" }, { status: 400 });
    }
    if (content.length > MAX_INSPIRATION_CHARS) {
      return NextResponse.json(
        { error: `单条灵感不超过 ${MAX_INSPIRATION_CHARS} 字` },
        { status: 400 },
      );
    }

    const date = todayInShanghai();
    const used = await countTodayInspirations(user.id, date);
    if (used >= DAILY_INSPIRATION_LIMIT) {
      return NextResponse.json(
        { error: `今天的 ${DAILY_INSPIRATION_LIMIT} 条灵感已记满，明天再来吧` },
        { status: 429 },
      );
    }

    const item = await insertInspiration({ userId: user.id, content, date });
    return NextResponse.json(
      { item, remaining: DAILY_INSPIRATION_LIMIT - used - 1 },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "灵感发布失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
