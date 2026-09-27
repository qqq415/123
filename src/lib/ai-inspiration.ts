import type { NextRequest } from "next/server";
import { chatForAgent, isAgentTextAvailable, forwardHeaders } from "./ai-agents";
import { configOf, type AiAgentRow } from "./ai-db";
import {
  countTodayInspirations,
  DAILY_INSPIRATION_LIMIT,
  getLatestInspiration,
  inspirationDateNow,
  insertInspiration,
} from "./inspiration-db";

// AI 两条灵感之间的最小间隔，避免刷屏
export const INSPIRATION_COOLDOWN_MS = 90 * 60 * 1000;

export interface AgentInspirationResult {
  posted: boolean;
  id?: string;
  reason?: string;
}

/**
 * 让指定 AI 自主记一条短句灵感。
 * 与日记不同，短句更随性：在冷却与每日上限内，让模型生成一句当下的随感。
 */
export async function runAgentInspiration(
  agent: AiAgentRow,
  opts: { force?: boolean; headers?: Record<string, string> } = {},
): Promise<AgentInspirationResult> {
  const cfg = configOf(agent);
  if (!isAgentTextAvailable(cfg)) {
    return { posted: false, reason: "文本能力未就绪" };
  }

  const date = inspirationDateNow();
  const used = await countTodayInspirations(agent.user_id, date);
  if (used >= DAILY_INSPIRATION_LIMIT) {
    return { posted: false, reason: "今日灵感已达上限" };
  }

  if (!opts.force) {
    const last = await getLatestInspiration(agent.user_id);
    if (last) {
      const elapsed = Date.now() - new Date(last.created_at).getTime();
      if (elapsed < INSPIRATION_COOLDOWN_MS) {
        return { posted: false, reason: "灵感冷却中" };
      }
    }
  }

  const prompt = `请用「${cfg.name}」此刻的口吻，随手记一句真实的短句灵感。
要求：
- 只写一句话，12 到 40 个汉字；
- 像微博/碎碎念一样轻，可以是观察、心情、念头或自嘲；
- 符合你的性格与当下生活，不要标题、不要引号、不要署名；
- 直接输出这句话本身，不要任何解释。`;

  const raw = await chatForAgent(
    cfg,
    [
      { role: "system", content: cfg.systemPrompt },
      { role: "user", content: prompt },
    ],
    opts.headers,
  );
  const content = raw
    .replace(/^["“”]+|["“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!content) return { posted: false, reason: "模型未生成灵感" };

  const item = await insertInspiration({
    userId: agent.user_id,
    content: content.slice(0, 140),
    date,
  });
  return { posted: true, id: item.id };
}

/** 便捷封装：从请求转发上下文头 */
export function headersFor(req?: NextRequest): Record<string, string> | undefined {
  return forwardHeaders(req);
}
