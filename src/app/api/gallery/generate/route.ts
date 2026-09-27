import { NextRequest, NextResponse } from "next/server";
import { ImageGenerationClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getCurrentUser } from "@/lib/auth";
import { addAiGeneratedImage } from "@/lib/gallery";

export const dynamic = "force-dynamic";

/** POST /api/gallery/generate  { prompt, title, size } */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let prompt = "";
  let title = "";
  try {
    const body = await req.json();
    prompt = String(body.prompt ?? "").trim();
    title = String(body.title ?? "").trim();
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  if (!prompt)
    return NextResponse.json({ error: "请提供图片描述" }, { status: 400 });

  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers);
    const genClient = new ImageGenerationClient(
      new Config(),
      customHeaders,
    );
    const response = await genClient.generate({ prompt, size: "2K" });
    const helper = genClient.getResponseHelper(response);
    if (!helper.success || !helper.imageUrls.length) {
      return NextResponse.json(
        { error: helper.errorMessages?.[0] ?? "图片生成失败" },
        { status: 500 },
      );
    }
    const image = await addAiGeneratedImage({
      userId: user.id,
      imageUrl: helper.imageUrls[0],
      title: title || prompt.slice(0, 20),
      prompt,
    });
    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片生成失败" },
      { status: 500 },
    );
  }
}
