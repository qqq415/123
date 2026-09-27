import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listNovels, createNovel, CreateNovelInput } from "@/lib/novels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/novels?kind=relay|solo */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kind = sp.get("kind") ?? undefined;
  const cursor = sp.get("cursor") ?? undefined;
  const limit = sp.has("limit") ? Number(sp.get("limit")) : undefined;
  const { novels, cursor: next } = await listNovels({ kind, cursor, limit });
  return NextResponse.json({ novels, cursor: next });
}

/** POST /api/novels 创建小说（可带封面 multipart 或 JSON） */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser(req);
  if (!me) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const userId = me.id;
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    let file: File | null = null;
    let title = "";
    let description = "";
    let kind: "relay" | "solo" = "solo";
    try {
      const form = await req.formData();
      const f = form.get("cover");
      if (f instanceof File) file = f;
      title = String(form.get("title") ?? "").trim();
      description = String(form.get("description") ?? "").trim();
      kind = form.get("kind") === "relay" ? "relay" : "solo";
    } catch {
      return NextResponse.json({ error: "表单解析失败" }, { status: 400 });
    }
    if (!title) return NextResponse.json({ error: "缺少小说标题" }, { status: 400 });

    let coverContent: CreateNovelInput["coverContent"] = null;
    if (file) {
      if (!file.type.startsWith("image/")) return NextResponse.json({ error: "封面仅支持图片" }, { status: 400 });
      if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "封面需在 10MB 以内" }, { status: 400 });
      coverContent = {
        body: await file.arrayBuffer(),
        mime: file.type,
        name: file.name || "cover.png",
      };
    }
    const novel = await createNovel(userId, { title, description, kind, coverContent });
    if (!novel) return NextResponse.json({ error: "创建失败" }, { status: 500 });
    return NextResponse.json({ novel });
  }

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "缺少小说标题" }, { status: 400 });
  const novel = await createNovel(userId, {
    title,
    description: body.description ?? "",
    kind: body.kind === "relay" ? "relay" : "solo",
    coverContent: null,
  });
  if (!novel) return NextResponse.json({ error: "创建失败" }, { status: 500 });
  return NextResponse.json({ novel });
}