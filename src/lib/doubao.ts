/**
 * 豆包（火山方舟 Ark）直连适配器
 * ------------------------------------------------------------------
 * 不经扣子中转，直接调用火山方舟官方 OpenAI 兼容接口。
 *
 * 所需环境变量：
 *   DOUBAO_API_KEY 必填，火山方舟 API Key（新版为 ark- 开头）
 *
 * 模型说明：扣子内部别名（如 doubao-seed-2-0-pro-260215）并非方舟真实
 * 模型 ID，这里通过 resolveDoubaoModel 映射到方舟已开通的真实模型。
 */

import type { AiAgentConfig } from "./ai-agents";
import { openAICompatibleChat, type ChatMessage } from "./openai-compat";

const BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";

/** 扣子别名 -> 火山方舟真实模型 ID 的映射 */
const MODEL_ALIASES: Record<string, string> = {
  "doubao-seed-2-0-pro-260215": "doubao-seed-evolving",
};

/** 是否已配置豆包凭据 */
export function isDoubaoConfigured(): boolean {
  return Boolean(resolveDoubaoApiKey());
}

/** 读取豆包 API Key（兼容 DOUBAO_API_KEY / ARK_API_KEY 两种命名） */
export function resolveDoubaoApiKey(): string {
  return (
    process.env.DOUBAO_API_KEY?.trim() ||
    process.env.ARK_API_KEY?.trim() ||
    ""
  );
}

/** 把账号配置里的模型解析为火山方舟真实模型 ID */
export function resolveDoubaoModel(cfg: AiAgentConfig): string {
  const fromEnv = process.env.DOUBAO_MODEL?.trim();
  if (fromEnv) return fromEnv;
  return MODEL_ALIASES[cfg.model] || cfg.model || "doubao-seed-evolving";
}

/** 调用豆包文本生成，返回模型生成文本 */
export async function doubaoChat(
  cfg: AiAgentConfig,
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = resolveDoubaoApiKey();
  if (!apiKey) {
    throw new Error(
      "豆包未配置：请设置环境变量 DOUBAO_API_KEY（火山方舟 API Key）以启用该 AI 账号",
    );
  }
  return openAICompatibleChat({
    baseUrl: BASE_URL,
    apiKey,
    model: resolveDoubaoModel(cfg),
    temperature: cfg.temperature,
    messages,
  });
}
