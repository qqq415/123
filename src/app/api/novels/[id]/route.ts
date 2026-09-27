import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNovel, deleteNovel } from "@/lib/novels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/novels/[id] 返回小说 + 全部段落 + 当前用户能否接龙 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const me = await getCurrentUser(req);
  const result = await getNovel(id, me?.id ?? null);
  if (!result) return NextResponse.json({ error: "小说不存在" }, { status: 404 });
  return NextResponse.json(result);
}

/** DELETE /api/novels/[id] 仅创建者可删除 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const me = await getCurrentUser(req);
  if (!me) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const ok = await deleteNovel(id, me.id);
  if (!ok) return NextResponse.json({ error: "删除失败或无权删除" }, { status: 403 });
  return NextResponse.json({ ok: true });
}