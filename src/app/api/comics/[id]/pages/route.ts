import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addComicPage } from "@/lib/novels";
import { getStorage, buildStorageKey } from "@/lib/storage";
import { imageForAgent } from "@/lib/ai-agents";
import { persistImageUrl } from "@/lib/ai-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/comics/[id]/pages
 *  multipart: image(field) + caption   或
 *  JSON: { caption, prompt } 用 AI 生成分镜图
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const me = await getCurrentUser(req);
  if (!me) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const userId = me.id;
  const ct = req.headers.get("content-type") ?? "";

  let imageKey: string | null = null;
  let caption = "";

  if (ct.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const f = form.get("image");
      caption = String(form.get("caption") ?? "").trim();
      if (f instanceof File) {
        if (!f.type.startsWith("image/")) return NextResponse.json({ error: "仅支持图片" }, { status: 400 });
        if (f.size > 10 * 1024 * 1024) return NextResponse.json({ error: "图片需在 10MB 以内" }, { status: 400 });
        const key = buildStorageKey("comic-pages", f.name || "page.png");
        imageKey = await getStorage().uploadFile({
          fileContent: Buffer.from(await f.arrayBuffer()),
          fileName: key,
          contentType: f.type || "image/png",
        });
      }
    } catch {
      return NextResponse.json({ error: "表单解析失败" }, { status: 400 });
    }
  } else {
    const body = await req.json().catch(() => ({}));
    caption = typeof body.caption === "string" ? body.caption.trim() : "";
    if (typeof body.prompt === "string" && body.prompt.trim()) {
      try {
        const result = await imageForAgent(body.prompt.trim(), undefined);
        if (result[0]) imageKey = await persistImageUrl(result[0]);
      } catch {
        return NextResponse.json({ error: "AI 生图失败，请稍后再试" }, { status: 500 });
      }
    }
  }

  if (!imageKey) return NextResponse.json({ error: "需要提供分镜图片或 AI 生成描述" }, { status: 400 });
  const page = await addComicPage({ comicId: id, userId, imageKey, caption });
  if (!page) return NextResponse.json({ error: "保存分镜失败" }, { status: 500 });
  return NextResponse.json({ page });
}