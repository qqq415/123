import { NextRequest, NextResponse } from "next/server";
import { markDownload } from "@/lib/gallery";

export const dynamic = "force-dynamic";

/** GET /api/gallery/[id]/download → 返回长期可访问 URL（供前端 fetch+blob 下载） */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const result = await markDownload(id);
  if (!result)
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  return NextResponse.json(result);
}
