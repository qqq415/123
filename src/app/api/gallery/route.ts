import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listGalleryImages, addUploadedImage } from "@/lib/gallery";

export const dynamic = "force-dynamic";

/** GET /api/gallery?limit=&cursor=&source=&user= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { images, cursor } = await listGalleryImages({
    limit: Number(sp.get("limit") ?? 24),
    cursor: sp.get("cursor") ?? undefined,
    source: sp.get("source") ?? undefined,
    userId: sp.get("user") ?? undefined,
  });
  return NextResponse.json({ images, cursor });
}

/** POST /api/gallery  multipart：file + title */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let file: File | null = null;
  let title = "";
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
    title = String(form.get("title") ?? "").trim();
  } catch {
    return NextResponse.json({ error: "文件解析失败" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "未找到图片" }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "仅支持图片文件" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "图片需在 10MB 以内" }, { status: 400 });

  try {
    const image = await addUploadedImage({
      userId: user.id,
      file,
      title: title || "无题",
    });
    return NextResponse.json({ image });
  } catch {
    return NextResponse.json({ error: "上传失败，请稍后再试" }, { status: 500 });
  }
}
