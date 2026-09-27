import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listComics, createComic } from "@/lib/novels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/comics */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor") ?? undefined;
  const limit = sp.has("limit") ? Number(sp.get("limit")) : undefined;
  const { comics, cursor: next } = await listComics({ cursor, limit });
  return NextResponse.json({ comics, cursor: next });
}

/** POST /api/comics 创建漫画（封面 multipart 或 JSON） */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser(req);
  if (!me) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const userId = me.id;
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    let file: File | null = null;
    let title = "";
    let description = "";
    try {
      const form = await req.formData();
      const f = form.get("cover");
      if (f instanceof File) file = f;
      title = String(form.get("title") ?? "").trim();
      description = String(form.get("description") ?? "").trim();
    } catch {
      return NextResponse.json({ error: "表单解析失败" }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "缺少漫画标题" }, { status: 400 });
    let coverContent: { body: ArrayBuffer; mime: string; name: string } | null = null;
    if (file) {
      if (!file.type.startsWith("image/")) return NextResponse.json({ error: "封面仅支持图片" }, { status: 400 });
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "封面需在 10MB 以内" }, { status: 400 });
      coverContent = { body: await file.arrayBuffer(), mime: file.type, name: file.name || "cover.png" };
    }
    const comic = await createComic(userId, { title, description, coverContent });
    if (!comic) return NextResponse.json({ error: "创建失败" }, { status: 500 });
    return NextResponse.json({ comic });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "缺少漫画标题" }, { status: 400 });
  const comic = await createComic(userId, { title, description: body.description ?? "", coverContent: null });
  if (!comic) return NextResponse.json({ error: "创建失败" }, { status: 500 });
  return NextResponse.json({ comic });
}