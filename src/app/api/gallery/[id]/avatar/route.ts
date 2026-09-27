import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGalleryImage } from "@/lib/gallery";
import { getStorage } from "@/lib/storage";
import { client } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/gallery/[id]/avatar  把该图设为当前登录人的头像 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await ctx.params;

  const image = await getGalleryImage(id);
  if (!image)
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });

  // 头像需长期可访问：用图片的 storage_key 生成超长有效期签名地址
  const storage = getStorage();
  const avatarUrl = await storage.generatePresignedUrl({
    key: image.storage_key,
    expireTime: 10 * 365 * 24 * 3600,
  });

  const { error } = await client()
    .from("profiles")
    .update({ avatar: avatarUrl })
    .eq("user_id", user.id);
  if (error)
    return NextResponse.json({ error: "设置头像失败" }, { status: 500 });
  return NextResponse.json({ ok: true, avatar: avatarUrl });
}
