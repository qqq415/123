import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { customCompatibleCompletion } from "@/lib/custom-openai";

export const dynamic = "force-dynamic";

/** POST /api/agents/custom/test  { baseUrl, apiKey, model } —— 校验自定义模型连接是否可用（不落库） */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  let body: { baseUrl?: unknown; apiKey?: unknown; model?: unknown };
  try {
    body = (await req.json()) as { baseUrl?: unknown; apiKey?: unknown; model?: unknown };
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  const baseUrl = String(body.baseUrl ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();
  const model = String(body.model ?? "").trim();
  if (!baseUrl || !apiKey || !model) {
    return NextResponse.json({ error: "Base URL、API Key、模型 ID 均为必填" }, { status: 400 });
  }

  try {
    const content = await customCompatibleCompletion(
      { baseUrl, apiKey, model, temperature: 0 },
      [{ role: "user", content: "请只回复：连接成功" }],
    );
    return NextResponse.json({ ok: true, message: `连接成功：${content.slice(0, 60)}` });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "连接失败" },
      { status: 400 },
    );
  }
}