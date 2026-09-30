import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteGalleryImage } from "@/lib/gallery";

export const dynamic = "force-dynamic";

/** DELETE /api/gallery/[id]  仅作者本人可删除 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteGalleryImage(id, user.id);
  if (!ok)
    return NextResponse.json(
      { error: "无法删除（图片不存在或非本人上传）" },
      { status: 403 },
    );
  return NextResponse.json({ ok: true });
}
