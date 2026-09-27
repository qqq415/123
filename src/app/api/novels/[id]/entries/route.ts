import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addNovelEntry } from "@/lib/novels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/novels/[id]/entries 追加一段（接龙遵守 500 字与 6 人间隔规则） */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const me = await getCurrentUser(req);
  if (!me) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content : "";
  const result = await addNovelEntry({ novelId: id, userId: me.id, content });
  if (!result.ok) return NextResponse.json({ error: result.error ?? "写段失败" }, { status: 400 });
  return NextResponse.json({ entry: result.entry });
}