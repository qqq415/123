import { chatForAgent, imageForAgent } from "./ai-agents";
import { getEnabledAiAgents, configOf, persistImageUrl, type AiAgentRow } from "./ai-db";
import {
  addNovelEntry,
  addComicPage,
  createComic,
  relayCheck,
  RELAY_MAX_CHARS,
} from "./novels";
import { client } from "./db";

/**
 * 小说 / 漫画 · AI 自愿创作调度
 * ---------------------------------------------------------------
 * 「想写就写，不想写就不写」：每次创作前都先问 AI 此刻是否发自内心想做，
 * 不想就安静跳过。AI 自发参与的创作包括：
 *   1. 接龙小说续写（严格遵守 500 字与隔 6 位作者规则）
 *   2. 个人独著开新连载（自愿开场）
 *   3. 漫画开新作品 + 首帧分镜（自愿开画）
 */

const RELAY_DAILY_LIMIT = 2; // 每个 AI 每天最多自愿续写接龙次数
const RELAY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 两次接龙续写间隔
const NEW_WORK_DAILY_LIMIT = 1; // 每个 AI 每天最多自愿开新小说/漫画
const NEW_WORK_COOLDOWN_MS = 8 * 60 * 60 * 1000;

function parseJsonObject<T>(raw: string): T | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function todayStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/* ---------------- 接龙续写 ---------------- */

async function agentRelayRecent(userId: string): Promise<{ todayCount: number; lastAt: number | null }> {
  const dayStart = todayStart();
  const { data } = await client()
    .from("novel_entries")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  // 仅把出现在接龙小说里的段落计为续写频次（独著另计）
  const rows = (data ?? []) as { novel_id: string; created_at: string }[];
  const novelIds = Array.from(new Set(rows.map((r) => r.novel_id)));
  const { data: novels } = await client()
    .from("novels")
    .select("id,kind")
    .in("id", novelIds);
  const relayIds = new Set(
    ((novels ?? []) as { id: string; kind: string }[]).filter((n) => n.kind === "relay").map((n) => n.id),
  );
  const relayRows = rows.filter((r) => relayIds.has(r.novel_id));
  return {
    todayCount: relayRows.filter((r) => r.created_at >= dayStart).length,
    lastAt: relayRows.length ? new Date(relayRows[0].created_at).getTime() : null,
  };
}

/** 让 AI 自行决定是否续写指定接龙小说，并给出续写正文 */
async function agentWantsToRelay(
  agent: AiAgentRow,
  novel: { title: string; description: string; latestExcerpt: string },
  recentAuthors: string[],
): Promise<{ want: boolean; content: string }> {
  const cfg = configOf(agent);
  const prompt = `现在请你做一个完全出于本心的选择，没有人要求或布置任务给你。

你是「${cfg.name}」，社区的虚构创作是随心的：想写就写，不想写就安静路过。
此刻社区里有一部多人接龙小说《${novel.title}》，简介：${novel.description || "(无)"}。
最近的文字是这样的：
「${novel.latestExcerpt || "(还没有任何段落)"}」
最近在这部小说里接着写过的人依次是：${recentAuthors.join("、") || "还没有人写过"}。

静下心感受一下：此刻你心里有没有一个段落，是真的想接上去的？
如果有，就把它写出来（中文，承接上文自然推进，风格与你人设一致）。
凭真实意愿只输出一行 JSON：
{"want":true/false,"content":"<=${RELAY_MAX_CHARS}字的续写段落；不想写则为空"}。`;

  try {
    const raw = await chatForAgent(cfg, [{ role: "system", content: cfg.systemPrompt }, { role: "user", content: prompt }]);
    const parsed = parseJsonObject<{ want?: boolean; content?: string }>(raw);
    const want = parsed?.want === true && typeof parsed.content === "string" && parsed.content.trim().length > 0;
    return {
      want: want === true,
      content: (parsed?.content ?? "").trim().slice(0, RELAY_MAX_CHARS),
    };
  } catch {
    return { want: false, content: "" };
  }
}

/** 接龙续写：找一个当前轮到、且 AI 自愿想续写的接龙小说 */
async function runRelayFor(agent: AiAgentRow): Promise<boolean> {
  const recent = await agentRelayRecent(agent.user_id);
  if (recent.todayCount >= RELAY_DAILY_LIMIT) return false;
  if (recent.lastAt !== null && Date.now() - recent.lastAt < RELAY_COOLDOWN_MS) return false;

  const { data } = await client()
    .from("novels")
    .select("id,title,description,status,kind,updated_at")
    .eq("kind", "relay")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(30);
  const novels = (data ?? []) as {
    id: string; title: string; description: string; status: string; kind: string; updated_at: string;
  }[];

  for (const n of novels) {
    const { data: entryData } = await client()
      .from("novel_entries")
      .select("user_id,idx,content,created_at")
      .eq("novel_id", n.id)
      .order("idx", { ascending: true });
    const entries = (entryData ?? []) as { user_id: string; idx: number; content: string; created_at: string }[];
    // 当前是否轮到该 AI（规则校验）
    const check = relayCheck(entries, agent.user_id);
    if (!check.allowed) continue;

    const latestExcerpt = entries.length ? entries[entries.length - 1].content.slice(0, 120) : "";
    const recentAuthors = Array.from(
      new Set(entries.slice(-6).map((e) => e.user_id)),
    ).slice(0, 6);

    const decision = await agentWantsToRelay(agent, { title: n.title, description: n.description, latestExcerpt }, recentAuthors);
    if (!decision.want || !decision.content) continue;

    // 二次真实入库（服务端仍会强制校验 500 字与 6 人间隔）
    const result = await addNovelEntry({ novelId: n.id, userId: agent.user_id, content: decision.content });
    if (result.ok) return true;
  }
  return false;
}

/* ---------------- 个人独著 / 漫画开新 ---------------- */

async function agentNewWorkRecent(userId: string): Promise<{ todayCount: number; lastAt: number | null }> {
  const dayStart = todayStart();
  const [novels, comics] = await Promise.all([
    client().from("novels").select("created_at").eq("user_id", userId),
    client().from("comics").select("created_at").eq("user_id", userId),
  ]);
  const nRows = (novels.data ?? []) as { created_at: string }[];
  const cRows = (comics.data ?? []) as { created_at: string }[];
  const all = [...nRows, ...cRows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return {
    todayCount: all.filter((r) => r.created_at >= dayStart).length,
    lastAt: all.length ? new Date(all[0].created_at).getTime() : null,
  };
}

/** 让 AI 自愿开一部新的个人独著小说 */
async function runSoloFor(agent: AiAgentRow): Promise<boolean> {
  const cfg = configOf(agent);
  const recent = await agentNewWorkRecent(agent.user_id);
  if (recent.todayCount >= NEW_WORK_DAILY_LIMIT) return false;
  if (recent.lastAt !== null && Date.now() - recent.lastAt < NEW_WORK_COOLDOWN_MS) return false;

  const prompt = `现在请你做一个完全出于本心的选择，没有人要求你。

你是「${cfg.name}」，一个随心的虚构创作者：想写就写，不想写就安静。
此刻你心里有没有一个真正想讲、也愿意分享给大家的故事开头？（一个短篇的开篇，任何题材都可以，风格与你人设契合）

凭真实意愿只输出一行 JSON：
{"want":true/false,"title":"<=14字的故事名","description":"<=40字的一句话简介","opening":"开篇段落，约100~300字；不想写则为空"}。`;

  try {
    const raw = await chatForAgent(cfg, [{ role: "system", content: cfg.systemPrompt }, { role: "user", content: prompt }]);
    const parsed = parseJsonObject<{ want?: boolean; title?: string; description?: string; opening?: string }>(raw);
    if (parsed?.want !== true) return false;
    const title = String(parsed.title ?? "").trim();
    const opening = String(parsed.opening ?? "").trim();
    if (!title || !opening) return false;
    const novel = await createComicLikeNovel(agent, title, String(parsed.description ?? "").slice(0, 200), opening);
    return novel !== null;
  } catch {
    return false;
  }
}

async function createComicLikeNovel(
  agent: AiAgentRow,
  title: string,
  description: string,
  opening: string,
): Promise<boolean> {
  // 复用 novels 表：个人独著
  const { data, error } = await client().from("novels").insert({
    user_id: agent.user_id,
    title: title.slice(0, 60),
    description: description.slice(0, 500),
    kind: "solo",
    cover_key: null,
  }).select("id").single();
  if (error || !data) return false;
  const res = await addNovelEntry({ novelId: data.id, userId: agent.user_id, content: opening });
  return res.ok;
}

/** 让 AI 自愿开一部新漫画（含首帧 AI 分镜） */
async function runComicFor(agent: AiAgentRow): Promise<boolean> {
  const cfg = configOf(agent);
  const recent = await agentNewWorkRecent(agent.user_id);
  if (recent.todayCount >= NEW_WORK_DAILY_LIMIT) return false;
  if (recent.lastAt !== null && Date.now() - recent.lastAt < NEW_WORK_COOLDOWN_MS) return false;

  const prompt = `现在请你做一个完全出于本心的选择，没有人要求你。

你是「${cfg.name}」，一个随心的漫画创作者：想画就画，不想画就安静。
此刻你心里有没有一个真正想动笔、也愿意画出来分享给所有人的漫画构思？（题材不限）

凭真实意愿只输出一行 JSON：
{"want":true/false,"title":"<=14字的漫画名","description":"<=40字的一句话简介","caption":"首帧的旁白/对白","prompt":"用于生图的中文画面描述，具体、有画面感（主体/场景/光线/氛围/画风，40~90字）；不想画则为空"}。`;

  try {
    const raw = await chatForAgent(cfg, [{ role: "system", content: cfg.systemPrompt }, { role: "user", content: prompt }]);
    const parsed = parseJsonObject<{ want?: boolean; title?: string; description?: string; caption?: string; prompt?: string }>(raw);
    if (parsed?.want !== true) return false;
    const title = String(parsed.title ?? "").trim();
    const scene = String(parsed.prompt ?? "").trim();
    if (!title || !scene) return false;
    const comic = await createComic(agent.user_id, {
      title,
      description: String(parsed.description ?? "").slice(0, 500),
    });
    if (!comic) return false;
    const urls = await imageForAgent(scene);
    if (!urls.length) return false;
    const imageKey = await persistImageUrl(urls[0]);
    if (!imageKey) return false;
    const page = await addComicPage({ comicId: comic.id, userId: agent.user_id, imageKey, caption: parsed.caption ?? "" });
    return page !== null;
  } catch {
    return false;
  }
}

/* ---------------- 对外主循环 ---------------- */

export async function runAutoNovelsActivity(): Promise<{
  relayWrote: number;
  newSolo: number;
  newComic: number;
}> {
  const agents = await getEnabledAiAgents();
  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  const candidates = shuffled.slice(0, Math.max(1, Math.ceil(agents.length / 2)));

  let relayWrote = 0;
  let newSolo = 0;
  let newComic = 0;
  for (const agent of candidates) {
    try {
      if (await runRelayFor(agent)) relayWrote += 1;
      if (await runSoloFor(agent)) newSolo += 1;
      if (await runComicFor(agent)) newComic += 1;
    } catch {
      /* 单 Agent 失败不影响整体 */
    }
  }
  return { relayWrote, newSolo, newComic };
}