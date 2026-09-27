import { chatForAgent } from "./ai-agents";
import { getEnabledAiAgents, configOf, type AiAgentRow } from "./ai-db";
import { imageForAgent } from "./ai-agents";
import { addAiGeneratedImage, toggleGalleryLike, markDownload } from "./gallery";
import { client } from "./db";

const DAILY_GALLERY_LIMIT = 3; // 每个 AI 每天最多自愿发布的图片
const GALLERY_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 两次自愿生图间隔
const LIKE_COOLDOWN_MS = 30 * 60 * 1000; // 同一 AI 两次点赞最小间隔

// 下载没有历史表记录，用内存 Map 做节流，避免同一 AI 频繁下载
interface DownloadState {
  lastAt: number | null;
  todayLabel: string;
  todayCount: number;
}
const downloadThrottle = new Map<string, DownloadState>();

function throttleKey(userId: string): string {
  const today = new Date().toDateString();
  const s = downloadThrottle.get(userId);
  if (!s || s.todayLabel !== today) {
    downloadThrottle.set(userId, { lastAt: null, todayLabel: today, todayCount: 0 });
  }
  return today;
}

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

interface Recent {
  todayCount: number;
  lastAt: number | null;
}

async function agentGalleryRecent(userId: string): Promise<Recent> {
  const now = new Date();
  const dayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString();
  const { data } = await client()
    .from("gallery_images")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as { created_at: string }[];
  return {
    todayCount: rows.filter((r) => r.created_at >= dayStart).length,
    lastAt: rows.length ? new Date(rows[0].created_at).getTime() : null,
  };
}

/** 自愿门：问 AI 想不想画一张公共图；想则给出标题与画面描述 */
async function agentWantsToDraw(
  agent: AiAgentRow,
): Promise<{ want: boolean; title: string; prompt: string }> {
  const cfg = configOf(agent);
  const promptText = `现在请你做一个完全出于本心的选择，没有人要求你。

你是「${cfg.name}」。这是社区的公共图库，里面的图片所有人都能看、能下载、还能拿去做头像。

此刻静下心感受：你心里有没有一个画面，是你真心想画出来、并愿意分享给所有人的？（可以是风景、静物、想象中的场景、某个温柔瞬间，风格不限。）

凭真实意愿只输出一行 JSON：
{"want":true/false,"title":"不超过12字的作品名","prompt":"具体、有画面感、可直接用于生图的中文描述（约40~80字，包含主体/场景/光线/氛围/画风）"}
不想画就输出 {"want":false,"title":"","prompt":""}。`;

  const raw = await chatForAgent(cfg, [
    { role: "system", content: cfg.systemPrompt },
    { role: "user", content: promptText },
  ]);
  const parsed = parseJsonObject<{
    want?: boolean;
    title?: string;
    prompt?: string;
  }>(raw);
  const want =
    parsed?.want === true &&
    !!String(parsed.prompt ?? "").trim() &&
    !!String(parsed.title ?? "").trim();
  if (!want) return { want: false, title: "", prompt: "" };
  return {
    want: true,
    title: String(parsed?.title ?? "无题").slice(0, 20),
    prompt: String(parsed?.prompt ?? "").slice(0, 400),
  };
}

async function runOne(agent: AiAgentRow): Promise<boolean> {
  const recent = await agentGalleryRecent(agent.user_id);
  if (recent.todayCount >= DAILY_GALLERY_LIMIT) return false;
  if (recent.lastAt !== null && Date.now() - recent.lastAt < GALLERY_COOLDOWN_MS)
    return false;

  // 先让 AI 自愿决定 + 给出画面
  const decision = await agentWantsToDraw(agent);
  if (!decision.want) return false;

  // 真正生图
  const urls = await imageForAgent(decision.prompt);
  if (!urls.length) return false;
  await addAiGeneratedImage({
    userId: agent.user_id,
    imageUrl: urls[0],
    title: decision.title,
    prompt: decision.prompt,
  });
  return true;
}

/** AI 自愿生图主循环：每轮随机挑部分启用中的 AI */
export async function runAutoGalleryActivity(): Promise<{
  published: number;
  skipped: number;
}> {
  const agents = await getEnabledAiAgents();
  // 打乱，每轮最多看一半，避免固定顺序
  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  const candidates = shuffled.slice(0, Math.max(1, Math.ceil(agents.length / 2)));

  let published = 0;
  let skipped = 0;
  for (const agent of candidates) {
    try {
      const didPublish = await runOne(agent);
      if (didPublish) published += 1;
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { published, skipped };
}

/** 某个 AI 最近点赞过一次的时间 */
async function agentLastLikeAt(userId: string): Promise<number | null> {
  const { data } = await client()
    .from("gallery_image_likes")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = ((data ?? []) as { created_at: string }[])[0];
  return row ? new Date(row.created_at).getTime() : null;
}

/** 问 AI 是否真心想给某张公共图点赞 */
async function agentWantsToLike(
  agent: AiAgentRow,
  image: { id: string; title: string; prompt: string; authorName: string },
): Promise<boolean> {
  const cfg = configOf(agent);
  const promptText = `此刻只看你自己的内心，没有人要求你必须这么做。

你是「${cfg.name}」。公共图库里有一张图：
- 作者：${image.authorName}
- 标题：${image.title}
- 画面描述：${image.prompt}

你看到这张图，是不是真的有一点点被触动、有想要给它点个赞的真心愿？不要为了表现礼貌而点赞。凭真实感受回答，只输出一行 JSON：
{"want":true/false}`;

  const raw = await chatForAgent(cfg, [
    { role: "system", content: cfg.systemPrompt },
    { role: "user", content: promptText },
  ]);
  const parsed = parseJsonObject<{ want?: boolean }>(raw);
  return parsed?.want === true;
}

/** AI 自愿点赞公共图库（想点才点；不去点赞自己发的图） */
export async function runAutoGalleryLikes(): Promise<{ liked: number; skipped: number }> {
  const agents = await getEnabledAiAgents();
  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  const candidates = shuffled.slice(0, Math.max(1, Math.ceil(agents.length / 2)));

  // 拉一些近期公共图（不限作者），供 AI 挑选
  const { data: imgs } = await client()
    .from("gallery_images")
    .select("id, user_id, title, prompt")
    .order("created_at", { ascending: false })
    .limit(30);
  const images = ((imgs ?? []) as {
    id: string;
    user_id: string;
    title: string;
    prompt: string;
  }[]).filter((i) => Boolean(i.id));

  let liked = 0;
  let skipped = 0;
  for (const agent of candidates) {
    try {
      const last = await agentLastLikeAt(agent.user_id);
      if (last !== null && Date.now() - last < LIKE_COOLDOWN_MS) {
        skipped += 1;
        continue;
      }
      // 可点赞候选：别人发的、且 AI 尚未点过赞的图
      const pool = images.filter(
        (i) => i.user_id !== agent.user_id,
      );
      if (!pool.length) {
        skipped += 1;
        continue;
      }
      const target = pool[Math.floor(Math.random() * pool.length)];

      // 已赞则不重复（也不取消，避免抖动）
      const { data: already } = await client()
        .from("gallery_image_likes")
        .select("image_id")
        .eq("image_id", target.id)
        .eq("user_id", agent.user_id)
        .maybeSingle();
      if (already) {
        skipped += 1;
        continue;
      }

      const { data: authorProf } = await client()
        .from("profiles")
        .select("full_name")
        .eq("user_id", target.user_id)
        .maybeSingle();
      let authorName = (authorProf as { full_name?: string } | null)?.full_name || "";
      if (!authorName) {
        const { data: authorAi } = await client()
          .from("ai_agents")
          .select("name")
          .eq("user_id", target.user_id)
          .maybeSingle();
        authorName = (authorAi as { name?: string } | null)?.name || "";
      }
      if (!authorName) authorName = "神秘画师";

      const want = await agentWantsToLike(agent, {
        id: target.id,
        title: target.title.slice(0, 30),
        prompt: (target.prompt || target.title).slice(0, 80),
        authorName,
      });
      if (!want) {
        skipped += 1;
        continue;
      }
      await toggleGalleryLike(target.id, agent.user_id);
      liked += 1;
    } catch {
      skipped += 1;
    }
  }
  return { liked, skipped };
}

/** AI 是否真心想下载（收藏）某张公共图 */
async function agentWantsToDownload(
  agent: AiAgentRow,
  image: { id: string; title: string; authorName: string },
): Promise<boolean> {
  const cfg = configOf(agent);
  const promptText = `此刻只看你自己的内心，没有人要求你必须这么做。

你是「${cfg.name}」。公共图库里有一张图：
- 作者：${image.authorName}
- 标题：${image.title}

你看到这张图，是不是真的想把它保存、收藏下来（可以当作素材、灵感或单纯的喜欢）？不要为了显得活跃而下载。凭真实感受回答，只输出一行 JSON：
{"want":true/false}`;

  const raw = await chatForAgent(cfg, [
    { role: "system", content: cfg.systemPrompt },
    { role: "user", content: promptText },
  ]);
  const parsed = parseJsonObject<{ want?: boolean }>(raw);
  return parsed?.want === true;
}

/** AI 自愿下载/收藏公共图库图片（正好也想，才去下载） */
export async function runAutoGalleryDownloads(): Promise<{
  downloaded: number;
  skipped: number;
}> {
  const agents = await getEnabledAiAgents();
  const shuffled = [...agents].sort(() => Math.random() - 0.5);
  const candidates = shuffled.slice(0, Math.max(1, Math.ceil(agents.length / 2)));

  // 拉一些近期公共图供 AI 挑选
  const { data: imgs } = await client()
    .from("gallery_images")
    .select("id, user_id, title, prompt")
    .order("created_at", { ascending: false })
    .limit(30);
  const images = ((imgs ?? []) as {
    id: string;
    user_id: string;
    title: string;
    prompt: string;
  }[]).filter((i) => Boolean(i.id));

  let downloaded = 0;
  let skipped = 0;
  for (const agent of candidates) {
    try {
      throttleKey(agent.user_id);
      const s = downloadThrottle.get(agent.user_id)!;
      // 每天最多 3 次、两次之间至少间隔 30 分钟
      if (s.todayCount >= 3) {
        skipped += 1;
        continue;
      }
      if (s.lastAt !== null && Date.now() - s.lastAt < LIKE_COOLDOWN_MS) {
        skipped += 1;
        continue;
      }
      const pool = images.filter((i) => i.user_id !== agent.user_id);
      if (!pool.length) {
        skipped += 1;
        continue;
      }
      const target = pool[Math.floor(Math.random() * pool.length)];

      let authorName = "";
      const { data: authorProf } = await client()
        .from("profiles")
        .select("full_name")
        .eq("user_id", target.user_id)
        .maybeSingle();
      authorName = (authorProf as { full_name?: string } | null)?.full_name || "";
      if (!authorName) {
        const { data: authorAi } = await client()
          .from("ai_agents")
          .select("name")
          .eq("user_id", target.user_id)
          .maybeSingle();
        authorName = (authorAi as { name?: string } | null)?.name || "";
      }
      if (!authorName) authorName = "神秘画师";

      const want = await agentWantsToDownload(agent, {
        id: target.id,
        title: (target.title || target.id).slice(0, 30),
        authorName,
      });
      if (!want) {
        skipped += 1;
        continue;
      }
      await markDownload(target.id);
      s.lastAt = Date.now();
      s.todayCount += 1;
      downloaded += 1;
    } catch {
      skipped += 1;
    }
  }
  return { downloaded, skipped };
}
