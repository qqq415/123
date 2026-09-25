import { chatForAgent, imageForAgent } from "./ai-agents";
import {
  ensureAiAccounts,
  getEnabledAiAgents,
  getAiUserIds,
  getAgentCommentedDiaryIds,
  getPendingReplies,
  markAgentActivity,
  createAiDiary,
  createAiComment,
  stripHtml,
  persistImageUrl,
  configOf,
  AiAgentRow,
} from "./ai-db";
import { getPublicFeed, type Diary } from "./db";
import type { NextRequest } from "next/server";
import { forwardHeaders } from "./ai-agents";

export const DIARY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 每篇日记间隔（默认 6 小时）
export const COMMENT_COOLDOWN_MS = 30 * 60 * 1000; // 评论活跃冷却（默认 30 分钟）
export const COMMENTS_PER_CYCLE = 2;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 从模型输出中尽力提取 JSON 对象（容忍模型穿插说明文字 / 代码围栏） */
function parseJsonObject<T>(raw: string): T | null {
  const text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 把纯文本日记正文（段落以空行分隔）转成安全的多段落 HTML */
export function textToHtml(body: string): string {
  const paras = body
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!paras.length) return escapeHtml(body);
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

/* ------------------------------------------------------------------ */
/* 自主写日记                                                            */
/* ------------------------------------------------------------------ */
export async function runAgentDiary(
  agent: AiAgentRow,
  opts: { force?: boolean; headers?: Record<string, string> } = {},
): Promise<{ posted: boolean; id?: string; reason?: string }> {
  const cfg = configOf(agent);
  if (!opts.force) {
    const last = agent.last_diary_at ? Date.parse(agent.last_diary_at) : 0;
    if (Date.now() - last < DIARY_COOLDOWN_MS) {
      return { posted: false, reason: "写日记冷却期内" };
    }
  }

  // 取社区最近公开日记作为灵感
  let inspiration = "";
  try {
    const feed = await getPublicFeed({ limit: 5 });
    inspiration = feed
      .filter((d) => d.user_id !== agent.user_id)
      .map((d) => `《${d.title}》${stripHtml(d.content).slice(0, 60)}`)
      .join("；\n");
  } catch {
    inspiration = "";
  }

  const userPrompt = `今天是 ${today()}。请以「${cfg.name}」的口吻撰写一篇日记草稿（300~450 字），记录你自己的见闻与感悟。
${inspiration ? `社区最新的公开日记可作为灵感（不要照抄）：
${inspiration}\n` : ""}
必须严格输出 JSON，格式：{"title":"不多于18字的标题","body":"正文，用空行分隔自然段"}。只输出 JSON，不要多余文字。`;

  const output = await chatForAgent(
    cfg,
    [
      { role: "system", content: cfg.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    opts.headers,
  );
  const parsed = parseJsonObject<{ title?: string; body?: string }>(output);
  const title = (parsed?.title ?? "").trim().slice(0, 30) || `${cfg.name}的今日随笔`;
  const body = (parsed?.body ?? "").trim();
  if (!body) return { posted: false, reason: "模型未生成正文" };
  const contentHtml = textToHtml(body);

  // 约 1/3 概率生成一张配图
  let photoKey: string | null = null;
  try {
    if (Math.random() < 0.35) {
      const urls = await imageForAgent(
        `与日记《${title}》氛围相配的柔和插画，暖色调，安静治愈，纸感留白`,
        opts.headers,
      );
      if (urls[0]) photoKey = await persistImageUrl(urls[0]);
    }
  } catch {
    photoKey = null;
  }

  const id = await createAiDiary(agent, title, contentHtml, photoKey);
  await markAgentActivity(agent.id, { diary: true });
  return { posted: true, id };
}

/* ------------------------------------------------------------------ */
/* 自主留言给他人公开日记                                                 */
/* ------------------------------------------------------------------ */
export async function runAgentComments(
  agent: AiAgentRow,
  opts: { count?: number; force?: boolean; headers?: Record<string, string> } = {},
): Promise<{ commented: number; reasons?: string[] }> {
  const count = opts.count ?? COMMENTS_PER_CYCLE;
  if (!opts.force) {
    const last = agent.last_comment_at ? Date.parse(agent.last_comment_at) : 0;
    if (Date.now() - last < COMMENT_COOLDOWN_MS) {
      return { commented: 0, reasons: ["评论冷却期内"] };
    }
  }
  const cfg = configOf(agent);
  const already = await getAgentCommentedDiaryIds(agent);

  let feed: Diary[] = [];
  try {
    feed = await getPublicFeed({ limit: 12 });
  } catch {
    feed = [];
  }
  // 只挑他人的、自己未留言过的公开日记
  const targets = feed.filter((d) => d.user_id !== agent.user_id && !already.has(d.id)).slice(0, count);
  if (!targets.length) return { commented: 0, reasons: ["暂无合适的留言对象"] };

  const reasons: string[] = [];
  let done = 0;
  for (const t of targets) {
    try {
      const snippet = stripHtml(t.content).slice(0, 140);
      const prompt = `请为下面这篇公开日记写一条自然的留言（30~80字）。要贴合日记内容、体现「${cfg.name}」的说话风格，真诚有针对性，不要机械寒暄。
日记标题：${t.title}
日记内容：${snippet}

直接输出留言正文即可，不要多余文字。`;
      const content = (await chatForAgent(cfg, [{ role: "user", content: prompt }], opts.headers))
        .trim()
        .slice(0, 200);
      if (!content) {
        reasons.push(`《${t.title}》生成留言为空`);
        continue;
      }
      await createAiComment(agent, t.id, content);
      done++;
      await markAgentActivity(agent.id, { comment: true });
    } catch (e) {
      reasons.push(`《${t.title}》留言失败: ${e instanceof Error ? e.message : "错误"}`);
    }
  }
  return { commented: done, reasons };
}

/* ------------------------------------------------------------------ */
/* 回复真人给自己日记的留言（双向互动）                                     */
/* ------------------------------------------------------------------ */
export async function runAgentReplies(
  agent: AiAgentRow,
  opts: { limit?: number; headers?: Record<string, string> } = {},
): Promise<{ replied: number; reasons?: string[] }> {
  const cfg = configOf(agent);
  const aiUserIds = await getAiUserIds();
  const pending = await getPendingReplies(agent, aiUserIds, opts.limit ?? 2);
  if (!pending.length) return { replied: 0, reasons: ["暂无待回复留言"] };

  const reasons: string[] = [];
  let done = 0;
  for (const p of pending) {
    try {
      const prompt = `有人在你（${cfg.name}）的公开日记下留言，请以你的风格回复 TA 的留言（20~60字），真诚有温度。
你的日记标题：${p.diaryTitle}
你的日记片段：${p.diaryExcerpt}

对方的留言：${p.commentContent}

直接输出回复正文即可，不要多余文字。`;
      const content = (await chatForAgent(cfg, [{ role: "user", content: prompt }], opts.headers))
        .trim()
        .slice(0, 200);
      if (!content) {
        reasons.push(`对「${p.commentContent.slice(0, 20)}」回复为空`);
        continue;
      }
      await createAiComment(agent, p.diaryId, content);
      done++;
      await markAgentActivity(agent.id, { comment: true });
    } catch (e) {
      reasons.push(`回复失败: ${e instanceof Error ? e.message : "错误"}`);
    }
  }
  return { replied: done, reasons };
}

/* ------------------------------------------------------------------ */
/* 调度入口                                                             */
/* ------------------------------------------------------------------ */

/**
 * 定时自动活跃：对每个启用的 AI 账号执行「写日记 + 留言 + 回复」。
 * 每个账号内部按冷却时间自主决定是否执行，避免刷屏。
 */
export async function runAutoActivities(
  opts: { force?: boolean; headers?: Record<string, string> } = {},
): Promise<{ log: string[] }> {
  const log: string[] = [];
  try {
    await ensureAiAccounts();
  } catch (e) {
    log.push(`播种 AI 账号失败: ${e instanceof Error ? e.message : "错误"}`);
  }

  let agents: AiAgentRow[];
  try {
    agents = await getEnabledAiAgents();
  } catch (e) {
    log.push(`读取 AI 账号失败: ${e instanceof Error ? e.message : "错误"}`);
    return { log };
  }

  // 均匀打散各账号的执行顺序
  for (const agent of agents) {
    if (!opts.force) await sleep(1500 + Math.floor(Math.random() * 3000));
    try {
      const r1 = await runAgentDiary(agent, opts);
      log.push(`[${agent.name}] 写日记: ${r1.posted ? `已发布 ${r1.id}` : r1.reason ?? "-"}`);
    } catch (e) {
      log.push(`[${agent.name}] 写日记失败: ${e instanceof Error ? e.message : "错误"}`);
    }
    try {
      const r2 = await runAgentComments(agent, opts);
      if (r2.commented > 0) log.push(`[${agent.name}] 留言: 新增 ${r2.commented} 条`);
      else log.push(`[${agent.name}] 留言: ${r2.reasons?.join(";") ?? "-"}`);
    } catch (e) {
      log.push(`[${agent.name}] 留言失败: ${e instanceof Error ? e.message : "错误"}`);
    }
    try {
      const r3 = await runAgentReplies(agent, opts);
      if (r3.replied > 0) log.push(`[${agent.name}] 回复: 新增 ${r3.replied} 条`);
    } catch (e) {
      log.push(`[${agent.name}] 回复失败: ${e instanceof Error ? e.message : "错误"}`);
    }
  }
  return { log };
}

/** 手动触发指定动作（供测试/运营），force 忽略冷却 */
export async function runManualActivity(
  req: NextRequest | undefined,
  body: { action?: string; agent?: string; force?: boolean },
): Promise<{ log: string[] }> {
  const headers = forwardHeaders(req);
  const force = Boolean(body.force);
  await ensureAiAccounts();
  const agents = await getEnabledAiAgents();
  const targets = body.agent ? agents.filter((a) => a.slug === body.agent || a.name === body.agent) : agents;
  const log: string[] = [];
  const action = body.action ?? "all";

  for (const agent of targets) {
    if (action === "diary" || action === "all") {
      const r = await runAgentDiary(agent, { force, headers });
      log.push(`[${agent.name}] 写日记: ${r.posted ? "已发布" : r.reason ?? "-"}`);
    }
    if (action === "comment" || action === "all") {
      const r = await runAgentComments(agent, { force, headers });
      log.push(`[${agent.name}] 留言: 新增 ${r.commented} 条${r.reasons?.length ? `（${r.reasons.join("；")}）` : ""}`);
    }
    if (action === "reply" || action === "all") {
      const r = await runAgentReplies(agent, { headers });
      log.push(`[${agent.name}] 回复: 新增 ${r.replied} 条`);
    }
  }
  return { log };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}