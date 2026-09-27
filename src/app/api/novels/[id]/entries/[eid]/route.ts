import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteNovelEntry } from "@/lib/novels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/novels/[id]/entries/[eid] 仅该段作者可删除 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; eid: string }> }) {
  const { eid } = await ctx.params;
  const me = await getCurrentUser(req);
  if (!me) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const ok = await deleteNovelEntry(eid, me.id);
  if (!ok) return NextResponse.json({ error: "删除失败或无权删除" }, { status: 403 });
  return NextResponse.json({ ok: true });
}