import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getComicWithPages } from "@/lib/novels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/comics/[id] 漫画 + 全部分镜页 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { comic, pages } = await getComicWithPages(id);
  if (!comic) return NextResponse.json({ error: "漫画不存在" }, { status: 404 });
  return NextResponse.json({ comic, pages });
}