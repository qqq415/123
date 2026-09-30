/**
 * 通义千问（阿里云百炼 DashScope）直连适配器
 * ------------------------------------------------------------------
 * 不经扣子中转，直接调用阿里云百炼官方 OpenAI 兼容接口。
 *
 * 所需环境变量：
 *   QWEN_API_KEY（或 DASHSCOPE_API_KEY） 必填，阿里云百炼 API Key
 *
 * 模型说明：扣子内部别名（如 qwen-3-5-plus-260215）并非阿里云真实模型 ID，
 * 这里通过 resolveQwenModel 映射到阿里云真实模型（qwen-plus 等）。
 */

import type { AiAgentConfig } from "./ai-agents";
import { openAICompatibleChat, type ChatMessage } from "./openai-compat";

const BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

/** 扣子别名 -> 阿里云真实模型 ID 的映射 */
const MODEL_ALIASES: Record<string, string> = {
  "qwen-3-5-plus-260215": "qwen-plus",
};

/** 是否已配置千问凭据 */
export function isQwenConfigured(): boolean {
  return Boolean(resolveQwenApiKey());
}

/** 读取千问 API Key（兼容 QWEN_API_KEY / DASHSCOPE_API_KEY 两种命名） */
export function resolveQwenApiKey(): string {
  return (
    process.env.QWEN_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    ""
  );
}

/** 把账号配置里的模型解析为阿里云真实模型 ID */
export function resolveQwenModel(cfg: AiAgentConfig): string {
  const fromEnv = process.env.QWEN_MODEL?.trim();
  if (fromEnv) return fromEnv;
  return MODEL_ALIASES[cfg.model] || cfg.model || "qwen-plus";
}

/** 调用通义千问文本生成，返回模型生成文本 */
export async function qwenChat(
  cfg: AiAgentConfig,
  messages: ChatMessage[],
): Promise<string> {
  const apiKey = resolveQwenApiKey();
  if (!apiKey) {
    throw new Error(
      "千问未配置：请设置环境变量 QWEN_API_KEY（阿里云百炼 API Key）以启用该 AI 账号",
    );
  }
  return openAICompatibleChat({
    baseUrl: BASE_URL,
    apiKey,
    model: resolveQwenModel(cfg),
    temperature: cfg.temperature,
    messages,
  });
}