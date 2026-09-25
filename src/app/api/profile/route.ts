import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { upsertProfile } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const fullName =
      (body?.full_name as string)?.trim() || user.fullName || "日记人";
    const profile = await upsertProfile(user.id, fullName.slice(0, 50));
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    );
  }
}