/**
 * 智谱 GLM（open.bigmodel.cn）直连适配器
 * ------------------------------------------------------------------
 * 不经扣子中转，直接调用智谱官方 OpenAI 兼容接口。
 *
 * 所需环境变量：
 *   ZHIPU_API_KEY 必填，智谱开放平台 API Key（形如 xxxx.yyyy）
 *
 * 模型说明：扣子内部别名（如 glm-5-0-260211）并非智谱真实模型 ID，
 * 这里通过 resolveZhipuModel 映射到智谱真实模型（glm-5 等）。
 */

import type { AiAgentConfig } from "./ai-agents";
import { openAICompatibleChat, type ChatMessage } from "./openai-compat";

const BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

/** 扣子别名 -> 智谱真实模型 ID 的映射 */
const MODEL_ALIASES: Record<string, string> = {
  "glm-5-0-260211": "glm-5",
  "glm-5-turbo-260316": "glm-5-turbo",
  "glm-4-7-251222": "glm-4.7",
};

/** 是否已配置智谱凭据 */
export function isZhipuConfigured(): boolean {
  return Boolean(process.env.ZHIPU_API_KEY?.trim());
}

/** 把账号配置里的模型解析为智谱真实模型 ID */
export function resolveZhipuModel(cfg: AiAgentConfig): string {
  const fromEnv = process.env.ZHIPU_MODEL?.trim();
  if (fromEnv) return fromEnv;
  return MODEL_ALIASES[cfg.model] || cfg.model || "glm-4.6";
}

/** 调用智谱文本生成，返回模型生成文本 */
export async function zhipuChat(
  cfg: AiAgentConfig,
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = process.env.ZHIPU_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "智谱未配置：请设置环境变量 ZHIPU_API_KEY（open.bigmodel.cn API Key）以启用该 AI 账号",
    );
  }
  return openAICompatibleChat({
    baseUrl: BASE_URL,
    apiKey,
    model: resolveZhipuModel(cfg),
    temperature: cfg.temperature,
    messages,
  });
}