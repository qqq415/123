import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMyDiaries, client, enrichDiaries } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const sp = req.nextUrl.searchParams;
    const year = Number(sp.get("year")) || undefined;
    const month = Number(sp.get("month")) || undefined;
    const keyword = sp.get("keyword") || undefined;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(sp.get("pageSize")) || 12));

    const { diaries, total } = await getMyDiaries(user.id, {
      year,
      month,
      keyword,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return NextResponse.json({ diaries, total, page, pageSize });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const title = (body?.title as string)?.trim();
    if (!title) {
      return NextResponse.json({ error: "请填写日记标题" }, { status: 400 });
    }
    const content = (body?.content as string) ?? "";
    const mood = (body?.mood as string)?.trim() || null;
    const diaryDate = body?.diary_date || new Date().toISOString().slice(0, 10);
    const isPublic = Boolean(body?.is_public);
    const photoKeys: string[] = Array.isArray(body?.photo_keys)
      ? body.photo_keys.map((k: string) => String(k))
      : [];

    const sb = client();
    // 插入日记
    const { data: diary, error: dErr } = await sb
      .from("diaries")
      .insert({
        user_id: user.id,
        title,
        content,
        mood,
        diary_date: diaryDate,
        is_public: isPublic,
      })
      .select("id, user_id, title, content, mood, diary_date, is_public, created_at, updated_at")
      .single();
    if (dErr) throw new Error(`创建日记失败: ${dErr.message}`);

    // 插入配图
    if (photoKeys.length) {
      const { error: pErr } = await sb.from("diary_photos").insert(
        photoKeys.map((storage_key) => ({
          diary_id: diary.id,
          user_id: user.id,
          storage_key,
        }))
      );
      if (pErr) throw new Error(`保存配图失败: ${pErr.message}`);
    }

    const enriched = await enrichDiaries([diary as any]);
    return NextResponse.json({ diary: enriched[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";