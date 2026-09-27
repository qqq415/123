import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getStorage, buildStorageKey } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** PUT /api/profile/avatar  { avatar: string }
 * avatar 可以是 emoji / 文本，也可以是图片 URL（上传后由前端先换成 URL） */
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  let avatar = "";
  try {
    const body = await req.json();
    avatar = String(body.avatar ?? "").trim();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  if (!avatar) return NextResponse.json({ error: "头像不能为空" }, { status: 400 });
  if (avatar.length > 300)
    return NextResponse.json({ error: "头像内容过长" }, { status: 400 });

  const { error } = await client()
    .from("profiles")
    .update({ avatar })
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json(
      { error: "头像更新失败，请稍后再试" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, avatar });
}

/** POST /api/profile/avatar  multipart 图片，返回可访问 URL */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "文件解析失败" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "未找到图片" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: "图片需在 5MB 以内" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = buildStorageKey(`avatars/${user.id}`, file.name || "avatar.png");
    const storage = getStorage();
    const actualKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: key,
      contentType: file.type || "image/png",
    });
    // 头像需要长期可访问：给一个超长有效期的签名地址
    const url = await storage.generatePresignedUrl({
      key: actualKey,
      expireTime: 10 * 365 * 24 * 3600,
    });

    const { error } = await client()
      .from("profiles")
      .update({ avatar: url })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, avatar: url });
  } catch {
    return NextResponse.json({ error: "头像上传失败，请稍后再试" }, { status: 500 });
  }
}
