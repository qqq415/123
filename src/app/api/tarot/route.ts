import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTodaysDraw, getDrawHistory } from "@/lib/tarot-db";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const target = sp.get("user");
    const user = await getCurrentUser(req);
    const userId = target || user?.id || null;
    if (!userId) {
      return NextResponse.json({ today: null, history: [] });
    }
    const [today, history] = await Promise.all([
      getTodaysDraw(userId),
      getDrawHistory(userId, 14),
    ]);
    return NextResponse.json({ today, history });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";