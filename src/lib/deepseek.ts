/**
 * DeepSeek 大模型接入适配器（OpenAI 兼容接口）
 * ------------------------------------------------------------------
 * DeepSeek 不在 Coze SDK 内置可用模型列表中，需要独立的 API Key 接入。
 * 这里通过标准 OpenAI 兼容的 /chat/completions 接口调用 DeepSeek，
 * 模型支持 deepseek-chat（对话）与 deepseek-reasoner（深度思考）。
 *
 * 所需环境变量：
 *   DEEPSEEK_API_KEY  必填，DeepSeek 平台 API Key（https://platform.deepseek.com）
 *   DEEPSEEK_BASE_URL 可选，默认 https://api.deepseek.com
 *   DEEPSEEK_MODEL    可选，覆盖账号绑定模型的默认值（默认 deepseek-chat）
 *
 * 未配置 DEEPSEEK_API_KEY 时 isDeepSeekConfigured() 返回 false，
 * 调度会自动跳过该 AI 账号的文本生成，不会静默使用不存在的凭据。
 */

import type { AiAgentConfig } from "./ai-agents";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 是否已配置 DeepSeek 凭据 */
export function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim());
}

/** 读取实际生效的模型 ID */
export function resolveDeepSeekModel(cfg: AiAgentConfig): string {
  const fromEnv = process.env.DEEPSEEK_MODEL?.trim();
  return fromEnv || cfg.model || DEFAULT_MODEL;
}

function resolveBaseUrl(): string {
  return (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/**
 * 调用 DeepSeek 文本生成（非流式），返回模型生成的文本。
 * 未配置凭据时抛出带配置指引的明确错误。
 */
export async function deepseekChat(
  cfg: AiAgentConfig,
  messages: DeepSeekMessage[],
): Promise<string> {
  if (!isDeepSeekConfigured()) {
    throw new Error(
      "DeepSeek 未配置：请在环境变量中设置 DEEPSEEK_API_KEY（可选 DEEPSEEK_BASE_URL / DEEPSEEK_MODEL）以启用该 AI 账号",
    );
  }

  const model = resolveDeepSeekModel(cfg);
  const baseUrl = resolveBaseUrl();

  // deepseek-reasoner 不支持 temperature，构造请求体时兼容处理
  const payload: Record<string, unknown> = {
    model,
    messages,
    stream: false,
  };
  if (!model.startsWith("deepseek-reasoner")) {
    payload.temperature = cfg.temperature ?? 1.0;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek 接口错误（HTTP ${res.status}）: ${text.slice(0, 300) || "未知错误"}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (data.error?.message) {
    throw new Error(`DeepSeek 返回错误: ${data.error.message}`);
  }
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("DeepSeek 未返回有效内容");
  }
  return content;
}