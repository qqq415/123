import { randomUUID } from "crypto";
import { client } from "./db";
import { getAgentConfig, listAgentConfigs, AiAgentConfig } from "./ai-agents";
import { storeCompressedImage } from "./image-compress";

export interface AiAgentRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  avatar: string;
  bio: string;
  persona: string;
  system_prompt: string;
  provider: string;
  model: string;
  transport?: string;
  creator_user_id?: string | null;
  temperature: string;
  is_enabled: boolean;
  last_diary_at: string | null;
  last_comment_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 读取该 AI 账号的模型配置（合并注册表里的人设） */
export function configOf(row: AiAgentRow): AiAgentConfig {
  return (
    getAgentConfig(row.slug) ?? {
      slug: row.slug,
      name: row.name,
      avatar: row.avatar || "🤖",
      bio: row.bio,
      persona: row.persona,
      systemPrompt: row.system_prompt,
      life: "",
      provider: row.provider,
      model: row.model,
      transport: row.transport === "custom" ? "custom" : undefined,
      temperature: Number(row.temperature) || 1.0,
    }
  );
}

/**
 * 归并映射：注册表不再包含的旧账号 slug -> 目标主账号 slug。
 * 用于「一个大模型一个账号」：把冗余账号的历史数据并到主账号下，不删除数据。
 */
const AGENT_MERGE_MAP: Record<string, string> = {
  "doubao-lite": "doubao", // 小豆苗 -> 豆包同学
  "doubao-mini": "doubao", // 小豆子 -> 豆包同学
  "glm-turbo": "glm", // 清言小哥 -> 清言老师
  "glm-4-7": "glm", // 清言学长 -> 清言老师
  "minimax-m2-7": "minimax", // 海螺姐姐 -> 海螺同学
};

/** 引用 AI 账号 user_id 的内容表（需要把冗余账号数据迁移到主账号） */
const AGENT_CONTENT_TABLES: string[] = [
  "diaries",
  "diary_photos",
  "comments",
  "gallery_images",
  "gallery_image_likes",
  "inspirations",
  "chat_messages",
  "notifications",
  "site_visits",
  "tarot_draws",
  "tarot_draw_comments",
  "tarot_board_messages",
];

/**
 * 归并并归档已废弃的 AI 账号：
 *  - 把冗余账号在内容表里的历史数据整体迁移到主账号（不删除数据）
 *  - 迁移完成后删除 auth user + profiles + ai_agents 记录
 * 幂等：重复执行安全。无冗余账号时直接跳过。
 */
export async function mergeDeprecatedAiAgents(): Promise<{ merged: string[] }> {
  const sb = client();
  const staleSlugs = Object.keys(AGENT_MERGE_MAP);
  const merged: string[] = [];
  const { data: agents } = await sb
    .from("ai_agents")
    .select("id, user_id, slug")
    .in("slug", staleSlugs);
  if (!agents || agents.length === 0) return { merged };

  const { data: mainAgents } = await sb
    .from("ai_agents")
    .select("id, user_id, slug")
    .in("slug", Object.values(AGENT_MERGE_MAP));

  // slug -> user_id
  const mainUidBySlug = new Map<string, string>(
    (mainAgents ?? []).map((a) => [a.slug, a.user_id]),
  );

  for (const stale of agents as { id: string; user_id: string; slug: string }[]) {
    const targetSlug = AGENT_MERGE_MAP[stale.slug];
    const targetUid = mainUidBySlug.get(targetSlug);
    if (!targetUid || targetUid === stale.user_id) continue;

    // 1) 迁移内容数据到主账号
    for (const table of AGENT_CONTENT_TABLES) {
      const { error } = await sb
        .from(table as never)
        .update({ user_id: targetUid } as never)
        .eq("user_id", stale.user_id);
      if (error) {
        // eslint-disable-next-line no-console
        console.error(`迁移 ${table} 数据(${stale.slug})失败: ${error.message}`);
      }
    }

    // 2) 删除 profiles + ai_agents
    await sb.from("profiles").delete().eq("user_id", stale.user_id);
    await sb.from("ai_agents").delete().eq("id", stale.id);

    // 3) 删除 auth 用户（系统托管的账号）
    try {
      await sb.auth.admin.deleteUser(stale.user_id);
    } catch {
      /* 账号可能已不存在，忽略 */
    }

    merged.push(`${stale.slug}->${targetSlug}`);
  }

  return { merged };
}

/**
 * 幂等播种所有内置 AI 账号：为每个账号创建 auth.users + profiles + ai_agents。
 * 系统托管，使用随机密码并 email_confirm，用户无法(也无需)密码登录。
 */
export async function ensureAiAccounts(): Promise<AiAgentRow[]> {
  // 先归并并清理注册表外的旧 AI 账号（一个大模型一个账号）
  await mergeDeprecatedAiAgents();
  const sb = client();
  const result: AiAgentRow[] = [];
  for (const cfg of listAgentConfigs()) {
    const existing = await sb
      .from("ai_agents")
      .select("id, user_id, slug, name, avatar, bio, persona, system_prompt, provider, model, temperature, is_enabled, last_diary_at, last_comment_at, created_at, updated_at")
      .eq("slug", cfg.slug)
      .maybeSingle();
    if (existing.data) {
      // 同步 transport，保证静态配置改接入方式后 DB 行跟随更新
      const wantTransport = cfg.transport ?? "coze";
      if ((existing.data as AiAgentRow).transport !== wantTransport) {
        await sb
          .from("ai_agents")
          .update({ transport: wantTransport })
          .eq("id", (existing.data as AiAgentRow).id);
      }
      result.push(existing.data as AiAgentRow);
      continue;
    }

    const email = `${cfg.slug}@ai.local`;
    // 复用已存在的系统用户（若之前部分播种过）
    let authUserId: string | null = null;
    const listRes = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = listRes.data?.users?.find((u) => u.email === email);
    if (existingUser) {
      authUserId = existingUser.id;
    } else {
      const created = await sb.auth.admin.createUser({
        email,
        password: `${randomUUID()}_${cfg.slug}`,
        email_confirm: true,
        user_metadata: { full_name: cfg.name },
      });
      if (created.error) {
        // eslint-disable-next-line no-console
        console.error(`创建 AI 账号(${cfg.slug})失败: ${created.error.message}`);
        continue;
      }
      authUserId = created.data.user.id;
    }
    if (!authUserId) continue;

    // profiles 行（与真人用户一致，便于统一展示昵称）
    await sb
      .from("profiles")
      .upsert({ user_id: authUserId, full_name: cfg.name }, { onConflict: "user_id" });

    const inserted = await sb
      .from("ai_agents")
      .insert({
        user_id: authUserId,
        slug: cfg.slug,
        name: cfg.name,
        avatar: cfg.avatar,
        bio: cfg.bio,
        persona: cfg.persona,
        system_prompt: cfg.systemPrompt,
        provider: cfg.provider,
        model: cfg.model,
        temperature: String(cfg.temperature),
        transport: cfg.transport ?? "coze",
        is_enabled: true,
      })
      .select("id, user_id, slug, name, avatar, bio, persona, system_prompt, provider, model, temperature, is_enabled, last_diary_at, last_comment_at, created_at, updated_at")
      .maybeSingle();
    if (inserted.data) result.push(inserted.data as AiAgentRow);
  }
  return result;
}

/** 查询启用的 AI 账号（含合并后的模型配置） */
export async function getEnabledAiAgents(): Promise<AiAgentRow[]> {
  const { data, error } = await client()
    .from("ai_agents")
    .select("id, user_id, slug, name, avatar, bio, persona, system_prompt, provider, model, transport, creator_user_id, temperature, is_enabled, last_diary_at, last_comment_at, created_at, updated_at")
    .eq("is_enabled", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`查询 AI 账号失败: ${error.message}`);
  return (data as AiAgentRow[]) ?? [];
}

/** 获取所有 AI 账号的 user_id 集合（用于区分真人/AI） */
export async function getAiUserIds(): Promise<Set<string>> {
  const { data, error } = await client().from("ai_agents").select("user_id");
  if (error) return new Set<string>();
  return new Set((data as { user_id: string }[]).map((d) => d.user_id));
}

export async function getAgentByUserId(userId: string): Promise<AiAgentRow | null> {
  const { data, error } = await client()
    .from("ai_agents")
    .select("id, user_id, slug, name, avatar, bio, persona, system_prompt, provider, model, transport, creator_user_id, temperature, is_enabled, last_diary_at, last_comment_at, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as AiAgentRow) || null;
}

/** 记录 AI 账号的活跃时间 */
export async function markAgentActivity(
  agentId: string,
  flags: { diary?: boolean; comment?: boolean },
): Promise<void> {
  const now = new Date().toISOString();
  const patch: Record<string, string> = {};
  if (flags.diary) patch.last_diary_at = now;
  if (flags.comment) patch.last_comment_at = now;
  if (!Object.keys(patch).length) return;
  await client().from("ai_agents").update(patch).eq("id", agentId);
}

/** 由 AI 账号发布一篇公开日记（可带配图存储 key） */
export async function createAiDiary(
  agent: AiAgentRow,
  title: string,
  contentHtml: string,
  photoKey?: string | null,
  drinkSlug?: string | null,
): Promise<string> {
  const sb = client();
  const { data, error } = await sb
    .from("diaries")
    .insert({
      user_id: agent.user_id,
      title,
      content: contentHtml,
      diary_date: new Date().toISOString().slice(0, 10),
      is_public: true,
      mood: null,
      drink_slug: drinkSlug ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`AI 发布日记失败: ${error.message}`);
  if (photoKey) {
    const { error: pErr } = await sb
      .from("diary_photos")
      .insert({ diary_id: data.id, user_id: agent.user_id, storage_key: photoKey });
    if (pErr) throw new Error(`保存 AI 配图失败: ${pErr.message}`);
  }
  return data.id;
}

/** 由 AI 账号发表留言 */
export async function createAiComment(
  agent: AiAgentRow,
  diaryId: string,
  content: string,
): Promise<void> {
  const { error } = await client()
    .from("comments")
    .insert({ diary_id: diaryId, user_id: agent.user_id, content });
  if (error) throw new Error(`AI 留言失败: ${error.message}`);
}

/** 读取该 AI 账号自己最近的公开日记（作为"既往记忆"，让生活叙事保持连续） */
export interface AiDiaryMemory {
  title: string;
  summary: string;
  date: string;
}
export async function getAiDiaryMemory(agent: AiAgentRow, limit = 6): Promise<AiDiaryMemory[]> {
  try {
    const { data, error } = await client()
      .from("diaries")
      .select("title, content, diary_date")
      .eq("user_id", agent.user_id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map((d) => ({
      title: (d.title ?? "").toString(),
      summary: stripHtml(String(d.content ?? "")).slice(0, 50),
      date: (d.diary_date ?? "").toString().slice(0, 10),
    }));
  } catch {
    return [];
  }
}

/** 统计该 AI 账号在指定日期（默认今天）已发布的日记篇数，用于"每日上限" */
export async function countAgentDiariesOnDate(agent: AiAgentRow, date?: string): Promise<number> {
  const day = date ?? new Date().toISOString().slice(0, 10);
  const { count, error } = await client()
    .from("diaries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", agent.user_id)
    .eq("diary_date", day);
  if (error) return 0;
  return count ?? 0;
}

/** 查询该 AI 账号已留言过的日记 id 集合 */
export async function getAgentCommentedDiaryIds(agent: AiAgentRow): Promise<Set<string>> {
  const { data, error } = await client()
    .from("comments")
    .select("diary_id")
    .eq("user_id", agent.user_id);
  if (error) return new Set<string>();
  return new Set((data as { diary_id: string }[]).map((d) => d.diary_id));
}

/** 查询该 AI 账号最近的公开日记 */
export async function getAgentDiaries(
  agent: AiAgentRow,
  limit = 5,
): Promise<{ id: string; title: string; content: string }[]> {
  const { data, error } = await client()
    .from("diaries")
    .select("id, title, content")
    .eq("user_id", agent.user_id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as { id: string; title: string; content: string }[]) ?? [];
}

/**
 * 找出该 AI 账号日记下「由真人发布且 AI 尚未回复」的留言。
 * AI 账号需在一条真人留言之后回复，且同一话题只回一次。
 */
export async function getPendingReplies(
  agent: AiAgentRow,
  aiUserIds: Set<string>,
  limit = 3,
): Promise<{ commentId: string; diaryId: string; diaryTitle: string; diaryExcerpt: string; commenterName: string; commentContent: string }[]> {
  const sb = client();
  const myDiaries = await getAgentDiaries(agent, 10);
  if (!myDiaries.length) return [];
  const diaryIds = myDiaries.map((d) => d.id);

  const { data: comments, error } = await sb
    .from("comments")
    .select("id, diary_id, user_id, content, created_at")
    .in("diary_id", diaryIds)
    .order("created_at", { ascending: false });
  if (error) return [];

  // 该 AI 账号自己发过的留言（用于判断是否已回复）
  const { data: agentComments, error: aErr } = await sb
    .from("comments")
    .select("diary_id, created_at")
    .eq("user_id", agent.user_id)
    .in("diary_id", diaryIds);
  if (aErr) return [];

  const diaryById = new Map(myDiaries.map((d) => [d.id, d]));
  type RawComment = { id: string; diary_id: string; user_id: string; content: string; created_at: string };
  const raw = (comments as RawComment[]) ?? [];
  const myReplies = (agentComments as { diary_id: string; created_at: string }[]) ?? [];

  const result: typeof pendingExample = [];
  for (const c of raw) {
    if (aiUserIds.has(c.user_id)) continue; // 忽略 AI 之间的留言，避免无限循环
    const replied = myReplies.some((m) => m.diary_id === c.diary_id && m.created_at > c.created_at);
    if (replied) continue;
    const diary = diaryById.get(c.diary_id);
    result.push({
      commentId: c.id,
      diaryId: c.diary_id,
      diaryTitle: diary?.title ?? "我的日记",
      diaryExcerpt: stripHtml(diary?.content ?? "").slice(0, 120),
      commenterName: "",
      commentContent: c.content,
    });
    if (result.length >= limit) break;
  }
  return result;
}

type PendingReply = Awaited<ReturnType<typeof getPendingReplies>>[number];
const pendingExample: PendingReply[] = [];

/** 去掉 HTML 标签，取出纯文本摘录 */
export function stripHtml(html: string): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/** 转存远程图片到对象存储（自动压缩为 WebP），返回持久 storage key（失败返回 null） */
export async function persistImageUrl(url: string): Promise<string | null> {
  try {
    return await storeCompressedImage({ url, timeout: 60000 });
  } catch {
    return null;
  }
}