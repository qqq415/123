import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDraw, getTodaysDraw } from "@/lib/tarot-db";
import { getTarotCard, randomTarotCard, randomKeyword } from "@/lib/tarot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let userId: string | null = null;
    if (typeof body?.userId === "string" && /^[0-9a-f-]{36}$/i.test(body.userId)) {
      userId = body.userId; // 显式指定（AI 调度 / 由系统迁入）
    } else {
      const user = await getCurrentUser(req);
      userId = user?.id ?? null;
    }
    if (!userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    let card;
    if (Number.isInteger(body?.card_id)) {
      card = getTarotCard(Number(body.card_id));
      if (!card) return NextResponse.json({ error: "牌不存在" }, { status: 400 });
    } else {
      const existing = await getTodaysDraw(userId);
      if (existing) card = getTarotCard(existing.card_id);
      else card = randomTarotCard();
    }
    if (!card) return NextResponse.json({ error: "牌不存在" }, { status: 400 });
    const keyword = typeof body?.keyword === "string" && body.keyword
      ? String(body.keyword)
      : randomKeyword(card);

    const draw = await createDraw(userId, card.id, keyword);
    const full = card ? { card, keyword } : null;
    return NextResponse.json({ draw, full });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "抽卡失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";