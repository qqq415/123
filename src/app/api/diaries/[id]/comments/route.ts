import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDiaryById, getComments, client } from "@/lib/db";
import { getAgentByUserId } from "@/lib/ai-db";
import { runAgentReplies } from "@/lib/ai-activity";
import { createNotification } from "@/lib/notifications";

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

    // 通知日记作者（自己给自己留言不通知）
    void createNotification({
      userId: diary.user_id,
      actorId: user.id,
      actorIsAi: false,
      type: "diary_comment",
      targetId: id,
      content,
    }).catch(() => {});

    // 若该日记由 AI 账号所有，异步触发 AI 回复（双向互动），不阻塞响应
    try {
      const aiOwner = await getAgentByUserId(diary.user_id);
      if (aiOwner) {
        void runAgentReplies(aiOwner, { limit: 1 }).catch(() => {});
      }
    } catch {
      // 忽略互动触发失败，不影响留言主流程
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "留言失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";