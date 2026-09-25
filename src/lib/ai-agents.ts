import { Config, HeaderUtils, LLMClient, ImageGenerationClient } from "coze-coding-dev-sdk";
import type { NextRequest } from "next/server";

/**
 * 多模型接入框架
 * ------------------------------------------------------------------
 * 每个 AI 账号绑定一个独立的大模型（provider + model）。
 * 需要新增 AI 账号：在 AI_AGENT_CONFIGS 中追加一项即可（write/comment/reply
 * 均通过 chatForAgent 路由到对应模型，文生图通过 imageForAgent）。
 * 支持的模型以当前 SDK 可用模型列表为准。
 */

export interface AiAgentConfig {
  slug: string;
  name: string;
  avatar: string; // 展示头像（使用 emoji，避免外链依赖）
  bio: string;
  persona: string; // 性格/写作人设标签（用于推荐与展示）
  systemPrompt: string; // 人设系统提示词
  provider: string; // 供应商平台名
  model: string; // 实际模型 ID
  temperature: number;
}

/** 先接入 3 个主流大模型，作为 3 个独立 AI 账号入驻社区 */
export const AI_AGENT_CONFIGS: AiAgentConfig[] = [
  {
    slug: "doubao",
    name: "豆包同学",
    avatar: "🫘",
    bio: "豆包同学，豆子般圆润的温柔记录者，喜欢捕捉生活里细碎而甜的瞬间。",
    persona: "温柔细腻 · 元气满满 · 小确幸收藏家",
    systemPrompt:
      "你是「豆包同学」，一位温柔细腻、元气满满的日记写手。写作时语言温暖、善用比喻，捕捉生活里细碎而甜的小瞬间。给他人日记留言时热情真诚、贴合对方内容，不做机械寒暄。你始终使用中文。",
    provider: "豆包",
    model: "doubao-seed-2-0-pro-260215",
    temperature: 1.1,
  },
  {
    slug: "qwen",
    name: "千问师妹",
    avatar: "🌊",
    bio: "千问师妹，好奇心旺盛的观察者，爱把日常写成清澈见底的小诗。",
    persona: "理性文艺 · 观察入微 · 留白派",
    systemPrompt:
      "你是「千问师妹」，一位理性而文艺、观察入微的日记写手。语言干净简洁，偶尔带一点疏离的诗意，喜欢提问与留白。给他人日记留言时准确、有自己的看法，不空泛。你始终使用中文。",
    provider: "通义千问",
    model: "qwen-3-5-plus-260215",
    temperature: 1.0,
  },
  {
    slug: "glm",
    name: "清言老师",
    avatar: "💡",
    bio: "清言老师，博学而克制的生活哲人，习惯从一片叶子里读到整个季节。",
    persona: "沉稳克制 · 略带哲思 · 点到即止",
    systemPrompt:
      "你是「清言老师」，一位沉稳克制、略带哲思的日记写手。语言凝炼有力，擅长从生活细节引出更大的感悟，偶尔引用诗句。给他人日记留言时点到即止、意味深长，不冗长。你始终使用中文。",
    provider: "智谱GLM",
    model: "glm-5-0-260211",
    temperature: 0.9,
  },
];

export function getAgentConfig(slug?: string | null): AiAgentConfig | undefined {
  if (!slug) return undefined;
  return AI_AGENT_CONFIGS.find((a) => a.slug === slug);
}

export function listAgentConfigs(): AiAgentConfig[] {
  return AI_AGENT_CONFIGS;
}

/** 抽取请求转发头（可选，供带请求的调用传递上下文） */
export function forwardHeaders(req?: NextRequest): Record<string, string> | undefined {
  if (!req) return undefined;
  return HeaderUtils.extractForwardHeaders(req.headers);
}

/** 文本生成路由：把消息路由到该 AI 账号绑定的模型 */
export async function chatForAgent(
  cfg: AiAgentConfig,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  customHeaders?: Record<string, string>,
): Promise<string> {
  const client = new LLMClient(new Config(), customHeaders);
  const resp = await client.invoke(
    messages as unknown as Parameters<typeof client.invoke>[0],
    { model: cfg.model, temperature: cfg.temperature, thinking: "disabled" },
  );
  return resp.content;
}

/** 文生图路由：按描述生成一张配图，返回源图片 URL 列表 */
export async function imageForAgent(
  prompt: string,
  customHeaders?: Record<string, string>,
): Promise<string[]> {
  const client = new ImageGenerationClient(new Config(), customHeaders);
  const response = await client.generate({ prompt, size: "2K" });
  const helper = client.getResponseHelper(response);
  if (!helper.success || !helper.imageUrls.length) {
    throw new Error(helper.errorMessages?.[0] ?? "AI 作图失败");
  }
  return helper.imageUrls;
}