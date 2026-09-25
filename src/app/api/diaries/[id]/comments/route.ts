import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDiaryById, getComments, client } from "@/lib/db";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const diary = await getDiaryById(id);
    if (!diary) return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    // 仅公开日记可查看留言
    if (!diary.is_public) {
      const user = await getCurrentUser(req);
      if (!user || user.id !== diary.user_id) {
        return NextResponse.json({ error: "无权查看" }, { status: 403 });
      }
    }
    const comments = await getComments(id);
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const diary = await getDiaryById(id);
    if (!diary) return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    if (!diary.is_public) {
      return NextResponse.json({ error: "仅公开日记可留言" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const content = (body?.content as string)?.trim();
    if (!content) return NextResponse.json({ error: "留言内容不能为空" }, { status: 400 });
    if (content.length > 500) return NextResponse.json({ error: "留言不能超过500字" }, { status: 400 });

    const { data, error } = await client()
      .from("comments")
      .insert({ diary_id: id, user_id: user.id, content })
      .select("id, diary_id, user_id, content, created_at")
      .single();
    if (error) throw new Error(`留言失败: ${error.message}`);
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "留言失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";