import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDiaryById, client, enrichDiaries } from "@/lib/db";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const diary = await getDiaryById(id);
    if (!diary) {
      return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    }
    // 非公开且不是本人 → 拒绝
    if (!diary.is_public) {
      const user = await getCurrentUser(req);
      if (!user || user.id !== diary.user_id) {
        return NextResponse.json({ error: "无权查看该日记" }, { status: 403 });
      }
    }
    return NextResponse.json({ diary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const existing = await getDiaryById(id);
    if (!existing) return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "无权修改该日记" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (typeof body?.title === "string") patch.title = body.title.trim();
    if (typeof body?.content === "string") patch.content = body.content;
    if (typeof body?.mood === "string") patch.mood = body.mood.trim() || null;
    if (typeof body?.diary_date === "string") patch.diary_date = body.diary_date;
    if (typeof body?.is_public === "boolean") patch.is_public = body.is_public;

    const sb = client();
    const { data, error } = await sb
      .from("diaries")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, user_id, title, content, mood, diary_date, is_public, created_at, updated_at")
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);

    // 若提交了新配图列表则重建
    if (Array.isArray(body?.photo_keys)) {
      const keys: string[] = body.photo_keys.map((k: string) => String(k));
      const { error: delErr } = await sb.from("diary_photos").delete().eq("diary_id", id);
      if (delErr) throw new Error(`更新配图失败: ${delErr.message}`);
      if (keys.length) {
        const { error: insErr } = await sb.from("diary_photos").insert(
          keys.map((storage_key) => ({ diary_id: id, user_id: user.id, storage_key }))
        );
        if (insErr) throw new Error(`更新配图失败: ${insErr.message}`);
      }
    }

    const enriched = await enrichDiaries([data as any]);
    return NextResponse.json({ diary: enriched[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const existing = await getDiaryById(id);
    if (!existing) return NextResponse.json({ error: "日记不存在" }, { status: 404 });
    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "无权删除该日记" }, { status: 403 });
    }
    const { error } = await client()
      .from("diaries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";