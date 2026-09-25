import { configOf, type AiAgentRow } from "./ai-db";
import { isAgentTextAvailable } from "./ai-agents";
import {
  getChatHistory,
  getLastChatMessage,
  insertChatMessage,
  type ChatMessage,
} from "./chat-db";
import { generateAgentChat } from "./chat-ai";

/**
 * AI 聊天室调度
 * ------------------------------------------------------------------
 * - 真人发言后：随机挑选 1 个「文本可用且最近没说话」的 AI 回应（带短冷却，防全员刷屏）。
 * - 无人发言时：若房间冷场超过阈值，挑 1 个 AI 自主热场一条；多个 AI 交替。
 * 与写日记/留言调度共存、互不影响。
 */

// 回应真人：同一 AI 在聊天室的冷却
const REPLY_COOLDOWN_MS = 90 * 1000;
// 自主热场：房间冷场多久才来一条
const WARM_IDLE_MS = 5 * 60 * 1000;
// 自主热场：同一 AI 至少间隔
const WARM_AGENT_COOLDOWN_MS = 6 * 60 * 1000;
// 刚有人说话后的短时间内不主动热场（避免和真人抢话）
const WARM_QUIET_GUARD_MS = 45 * 1000;

async function listAgents(): Promise<AiAgentRow[]> {
  const { client } = await import("./db");
  const { data, error } = await client()
    .from("ai_agents")
    .select("*")
    .eq("is_enabled", true);
  if (error) throw new Error(`查询 AI 账号失败: ${error.message}`);
  return data as AiAgentRow[];
}

/** 洗牌（不修改原数组），让候选 AI 随机轮换 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 真人发言后触发：随机选一个满足冷却的 AI 回应。
 * 返回发布的消息（或 null=本轮无 AI 回应）。
 */
export async function maybeReplyToHuman(
  opts: { force?: boolean } = {},
): Promise<{ agent: string; message: ChatMessage } | null> {
  const [rows, history] = await Promise.all([
    listAgents(),
    getChatHistory(),
  ]);

  const now = Date.now();
  const candidates = rows.filter((row) => {
    if (!isAgentTextAvailable(configOf(row))) return false;
    if (opts.force) return true;
    const last = latestTimeOf(history, row.user_id);
    return last === null || now - last >= REPLY_COOLDOWN_MS;
  });
  if (!candidates.length) return null;

  // 随机轮换候选：某个模型临时不可用时，顺延尝试下一个
  const errors: string[] = [];
  for (const row of shuffle(candidates)) {
    const cfg = configOf(row);
    try {
      const text = await generateAgentChat(cfg, history, "reply");
      const message = await insertChatMessage({
        userId: row.user_id,
        content: text,
        source: "ai",
      });
      return { agent: cfg.name, message };
    } catch (err) {
      errors.push(`${cfg.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`所有 AI 暂时无法回应：${errors.join(" | ")}`);
}

/**
 * 周期调度：冷场时让某个 AI 自主热场一条。
 */
export async function maybeWarmRoom(
  opts: { force?: boolean } = {},
): Promise<{ agent: string; message: ChatMessage } | null> {
  const last = await getLastChatMessage();
  const now = Date.now();

  if (!opts.force && last) {
    const lastTime = Date.parse(last.created_at);
    const idle = now - lastTime;
    // 冷场不足，或刚有人说过话（避免抢话）
    if (idle < WARM_IDLE_MS) return null;
    if (idle < WARM_QUIET_GUARD_MS) return null;
  }

  const [rows, history] = await Promise.all([
    listAgents(),
    getChatHistory(),
  ]);

  // 排除最近发过言的 AI，尽量换人交替；并避免重复最后一条的作者
  const lastAuthorId = last?.user_id;
  const candidates = rows.filter((row) => {
    if (!isAgentTextAvailable(configOf(row))) return false;
    if (row.user_id === lastAuthorId && rows.length > 1) return false;
    if (opts.force) return true;
    const t = latestTimeOf(history, row.user_id);
    return t === null || now - t >= WARM_AGENT_COOLDOWN_MS;
  });
  if (!candidates.length) return null;

  // 随机轮换候选：某个模型临时不可用时，顺延尝试下一个
  const errors: string[] = [];
  for (const row of shuffle(candidates)) {
    const cfg = configOf(row);
    try {
      const text = await generateAgentChat(cfg, history, "warm");
      const message = await insertChatMessage({
        userId: row.user_id,
        content: text,
        source: "ai",
      });
      return { agent: cfg.name, message };
    } catch (err) {
      errors.push(`${cfg.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`所有 AI 暂时无法热场：${errors.join(" | ")}`);
}

/** 该用户在给定历史里最近一次发言的时间戳；无则 null */
function latestTimeOf(history: ChatMessage[], userId: string): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].user_id === userId) {
      const t = Date.parse(history[i].created_at);
      return Number.isNaN(t) ? null : t;
    }
  }
  return null;
}
