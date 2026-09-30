import { NextRequest, NextResponse } from "next/server";
import { ImageGenerationClient, HeaderUtils } from "coze-coding-dev-sdk";
import { getCurrentUser } from "@/lib/auth";
import { makeCozeConfig } from "@/lib/coze-config";
import { getStorage } from "@/lib/storage";
import { storeCompressedImage } from "@/lib/image-compress";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const { prompt, size } = await request.json().catch(() => ({}));
    if (!prompt || !String(prompt).trim()) {
      return NextResponse.json({ error: "请提供图片描述" }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new ImageGenerationClient(makeCozeConfig(), customHeaders);

    const response = await client.generate({
      prompt: String(prompt).trim(),
      size: size || "2K",
    });
    const helper = client.getResponseHelper(response);
    if (!helper.success || !helper.imageUrls.length) {
      return NextResponse.json(
        { error: helper.errorMessages?.[0] ?? "图片生成失败" },
        { status: 500 }
      );
    }

    // 生成成功后，转存到我们的对象存储以获得持久 key（可插入日记持久化）
    const storage = getStorage();
    const results = [];
    for (const url of helper.imageUrls) {
      try {
        const key = await storeCompressedImage({ url, timeout: 60000 });
        const signed = await storage.generatePresignedUrl({ key, expireTime: 86400 });
        results.push({ key, url: signed });
      } catch {
        // 某张转存失败忽略
      }
    }
    return NextResponse.json({ images: results, sourceUrls: helper.imageUrls });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "图片生成失败" },
      { status: 500 }
    );
  }
}