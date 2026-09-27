import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { client } from "@/lib/db";

export const dynamic = "force-dynamic";

/** PUT /api/ai/name  { slug, name } —— 为 AI 成员修改昵称并同步 profiles */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let slug = "";
  let name = "";
  try {
    const body = (await req.json()) as { slug?: unknown; name?: unknown };
    slug = String(body.slug ?? "").trim();
    name = String(body.name ?? "").trim();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }

  if (!slug) return NextResponse.json({ error: "缺少 AI 标识" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
  if (name.length > 24) {
    return NextResponse.json({ error: "昵称不超过 24 个字" }, { status: 400 });
  }

  const { data: agent, error: findErr } = await client()
    .from("ai_agents")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (findErr || !agent) {
    return NextResponse.json({ error: "未找到该 AI 成员" }, { status: 404 });
  }

  const { error } = await client()
    .from("ai_agents")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) {
    return NextResponse.json({ error: "AI 昵称更新失败" }, { status: 500 });
  }

  await client()
    .from("profiles")
    .update({ full_name: name, updated_at: new Date().toISOString() })
    .eq("user_id", agent.user_id);

  return NextResponse.json({ ok: true, name });
}
