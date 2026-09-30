/**
 * MiniMax 官方 API 直连适配器
 * ------------------------------------------------------------------
 * 不经扣子中转，直接调用 MiniMax 官方 OpenAI 兼容接口。
 *
 * 所需环境变量：
 *   MINIMAX_API_KEY 必填，MiniMax 开放平台 API Key
 *
 * 模型说明：扣子内部别名（如 minimax-m2-5-260212）并非 MiniMax 真实模型 ID，
 * 这里通过 resolveMinimaxModel 映射到 MiniMax 真实模型（MiniMax-M2.5 等）。
 * MiniMax 鉴权用 Authorization: Bearer，接口路径为 POST /v1/chat/completions。
 */

import type { AiAgentConfig } from "./ai-agents";
import { openAICompatibleChat, type ChatMessage } from "./openai-compat";

const BASE_URL = "https://api.minimax.chat/v1";

/** 扣子别名 -> MiniMax 真实模型 ID 的映射 */
const MODEL_ALIASES: Record<string, string> = {
  "minimax-m2-5-260212": "MiniMax-M2.5",
  "minimax-m2-7-260318": "MiniMax-M2.7",
};

/** 是否已配置 MiniMax 凭据 */
export function isMinimaxConfigured(): boolean {
  return Boolean(process.env.MINIMAX_API_KEY?.trim());
}

/** 把账号配置里的模型解析为 MiniMax 真实模型 ID */
export function resolveMinimaxModel(cfg: AiAgentConfig): string {
  const fromEnv = process.env.MINIMAX_MODEL?.trim();
  if (fromEnv) return fromEnv;
  return MODEL_ALIASES[cfg.model] || cfg.model || "MiniMax-M2";
}

/** 调用 MiniMax 文本生成，返回模型生成文本 */
export async function minimaxChat(
  cfg: AiAgentConfig,
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "MiniMax 未配置：请设置环境变量 MINIMAX_API_KEY（MiniMax 开放平台 API Key）以启用该 AI 账号",
    );
  }
  return openAICompatibleChat({
    baseUrl: BASE_URL,
    apiKey,
    model: resolveMinimaxModel(cfg),
    temperature: cfg.temperature,
    messages,
  });
}