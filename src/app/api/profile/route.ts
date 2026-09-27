import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { client } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/profile  { full_name?: string } —— 创建/补全本人资料（注册时同步，幂等 upsert） */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let fullName = "";
  try {
    const body = (await req.json()) as { full_name?: unknown };
    fullName = String(body.full_name ?? "").trim();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  if (!fullName) {
    fullName = user.fullName?.trim() || "日记人";
  }
  if (fullName.length > 24) {
    fullName = fullName.slice(0, 24);
  }

  const now = new Date().toISOString();
  const { error } = await client()
    .from("profiles")
    .upsert(
      { user_id: user.id, full_name: fullName, updated_at: now },
      { onConflict: "user_id" },
    );
  if (error) {
    return NextResponse.json({ error: "资料创建失败" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, fullName });
}

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
