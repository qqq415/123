import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { setDrawComment } from "@/lib/tarot-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    const comment = ((body?.comment as string) || "").trim();
    const draw = await setDrawComment(user.id, comment);
    if (!draw) return NextResponse.json({ error: "今天还没抽卡" }, { status: 400 });
    return NextResponse.json({ draw });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "留言失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";