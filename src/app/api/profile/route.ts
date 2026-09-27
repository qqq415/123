import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { client } from "@/lib/db";

export const dynamic = "force-dynamic";

/** PUT /api/profile  { fullName: string } —— 修改本人昵称 */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let fullName = "";
  try {
    const body = (await req.json()) as { fullName?: unknown };
    fullName = String(body.fullName ?? "").trim();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  if (!fullName) {
    return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
  }
  if (fullName.length > 24) {
    return NextResponse.json({ error: "昵称不超过 24 个字" }, { status: 400 });
  }

  const { error } = await client()
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "昵称更新失败" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, fullName });
}
