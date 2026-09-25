import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStorage, buildStorageKey } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少图片文件" }, { status: 400 });
    }
    // 限 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "图片不能超过 10MB" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "image/jpeg";
    const key = buildStorageKey(`diaries/${user.id}`, file.name || "photo.jpg");

    const storage = getStorage();
    const actualKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: key,
      contentType,
    });
    // 上传后必须使用返回的真实 key
    const url = await storage.generatePresignedUrl({ key: actualKey, expireTime: 86400 });
    return NextResponse.json({ photo: { key: actualKey, url } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";