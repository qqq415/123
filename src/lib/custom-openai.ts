/**
 * 自定义大模型接入（OpenAI 兼容 /chat/completions）
 * ------------------------------------------------------------------
 * 允许社区内真人用户把自己的大模型 API 入驻为独立 AI 账号：
 * 输入 Base URL + API Key + 模型 ID 即可。
 * 凭据只存放在 custom_agent_credentials 表（无公开 RLS，仅服务端可读），
 * 前端永不回读密钥。
 */

import { client } from "./db";
import type { AiAgentConfig } from "./ai-agents";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CustomConnection {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * 读取某自定义 AI 账号（按 ai_agents.user_id）的接入凭据。
 * 服务端专用：custom_agent_credentials 无公开 RLS，仅 service role 可读。
 */
export async function getCustomCredential(
  agentUserId: string,
): Promise<{ apiKey: string; baseUrl: string } | null> {
  const { data, error } = await client()
    .from("custom_agent_credentials")
    .select("api_key, base_url")
    .eq("user_id", agentUserId)
    .maybeSingle();
  if (error || !data) return null;
  return { apiKey: (data.api_key as string) ?? "", baseUrl: (data.base_url as string) ?? "" };
}

/** 自定义账号的 agentUserId 不存在时返回 null（供 chatForAgent 判断） */
export async function findAgentUserIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await client()
    .from("ai_agents")
    .select("user_id")
    .eq("slug", slug)
    .eq("transport", "custom")
    .maybeSingle();
  if (error || !data) return null;
  return (data as { user_id: string }).user_id;
}

/** 核心调用：向自定义 OpenAI 兼容接口发送一次文本生成，返回内容 */
export async function customCompatibleCompletion(
  conn: CustomConnection,
  messages: OpenAIMessage[],
): Promise<string> {
  const base = normalizeBaseUrl(conn.baseUrl);
  const payload: Record<string, unknown> = {
    model: conn.model,
    messages,
    stream: false,
  };
  if (typeof conn.temperature === "number") payload.temperature = conn.temperature;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(
      `无法连接 ${base}：${e instanceof Error ? e.message : "网络错误"}（请确认 Base URL 可达且为 OpenAI 兼容接口）`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`模型接口错误（HTTP ${res.status}）: ${text.slice(0, 300) || "未知错误"}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(`模型返回错误: ${data.error.message}`);
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("模型未返回有效内容");
  return content;
}

/** 根据 AI 账号配置（slug）读取其自定义接入凭据并完成一次调用 */
export async function customChatForAgent(
  cfg: AiAgentConfig,
  messages: OpenAIMessage[],
): Promise<string> {
  const agentUserId = await findAgentUserIdBySlug(cfg.slug);
  if (!agentUserId) {
    throw new Error(
      `自定义 AI 账号「${cfg.name}」不存在或未配置（transport 非 custom）`,
    );
  }
  const cred = await getCustomCredential(agentUserId);
  if (!cred || !cred.apiKey || !cred.baseUrl) {
    throw new Error(`自定义 AI 账号「${cfg.name}」缺少接入凭据（API Key / Base URL）`);
  }
  return customCompatibleCompletion(
    { baseUrl: cred.baseUrl, apiKey: cred.apiKey, model: cfg.model, temperature: cfg.temperature },
    messages,
  );
}