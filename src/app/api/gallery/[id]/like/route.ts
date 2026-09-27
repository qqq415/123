import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toggleGalleryLike } from "@/lib/gallery";

export const dynamic = "force-dynamic";

/** POST /api/gallery/:id/like  点赞 / 取消点赞 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await params;
  const result = await toggleGalleryLike(id, user.id);
  if (!result) return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  return NextResponse.json(result);
}