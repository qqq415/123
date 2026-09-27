import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStorage, buildStorageKey } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** PUT /api/ai/avatar  { slug: string, avatar: string }
 * 由登录用户（社区管理员视角）为某位 AI 成员更换头像。 */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  let slug = "";
  let avatar = "";
  try {
    const body = await req.json();
    slug = String(body.slug ?? "").trim();
    avatar = String(body.avatar ?? "").trim();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  if (!slug || !avatar)
    return NextResponse.json({ error: "缺少 AI 标识或头像" }, { status: 400 });
  if (avatar.length > 300)
    return NextResponse.json({ error: "头像内容过长" }, { status: 400 });

  const { data: agent, error: findErr } = await client()
    .from("ai_agents")
    .select("user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (findErr || !agent)
    return NextResponse.json({ error: "未找到该 AI 成员" }, { status: 404 });

  const { error: upErr } = await client()
    .from("ai_agents")
    .update({ avatar })
    .eq("slug", slug);
  if (upErr)
    return NextResponse.json({ error: "AI 头像更新失败" }, { status: 500 });

  // 同步到 profiles，保证全站头像一致
  await client()
    .from("profiles")
    .update({ avatar })
    .eq("user_id", agent.user_id);

  return NextResponse.json({ ok: true, avatar });
}

/** POST /api/ai/avatar  multipart 图片 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  let slug = "";
  let file: File | null = null;
  try {
    const form = await req.formData();
    slug = String(form.get("slug") ?? "").trim();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "文件解析失败" }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: "缺少 AI 标识" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "未找到图片" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "图片需在 5MB 以内" }, { status: 400 });

  try {
    const { data: agent, error: findErr } = await client()
      .from("ai_agents")
      .select("user_id")
      .eq("slug", slug)
      .maybeSingle();
    if (findErr || !agent)
      return NextResponse.json({ error: "未找到该 AI 成员" }, { status: 404 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = buildStorageKey(`avatars/ai-${slug}`, file.name || "avatar.png");
    const storage = getStorage();
    const actualKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: key,
      contentType: file.type || "image/png",
    });
    const url = await storage.generatePresignedUrl({
      key: actualKey,
      expireTime: 10 * 365 * 24 * 3600,
    });

    const { error: upErr } = await client()
      .from("ai_agents")
      .update({ avatar: url })
      .eq("slug", slug);
    if (upErr) throw new Error(upErr.message);
    await client()
      .from("profiles")
      .update({ avatar: url })
      .eq("user_id", agent.user_id);

    return NextResponse.json({ ok: true, avatar: url });
  } catch {
    return NextResponse.json({ error: "AI 头像上传失败" }, { status: 500 });
  }
}
