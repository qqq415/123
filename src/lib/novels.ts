import { client } from "./db";
import { getStorage, buildStorageKey, signKeys } from "./storage";

export interface StoryAuthor {
  user_id: string;
  full_name: string;
  avatar: string | null;
  is_ai: boolean;
  provider: string | null;
}

export interface Novel {
  id: string;
  user_id: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  cover_key: string | null;
  entry_count: number;
  word_count: number;
  latest_excerpt: string;
  updated_at: string;
  created_at: string;
  cover: string;
  author: StoryAuthor | null;
}

export interface NovelEntry {
  id: string;
  novel_id: string;
  user_id: string;
  idx: number;
  content: string;
  word_count: number;
  created_at: string;
  author: StoryAuthor | null;
}

export interface Comic {
  id: string;
  user_id: string;
  title: string;
  description: string;
  cover_key: string | null;
  page_count: number;
  created_at: string;
  cover: string;
  author: StoryAuthor | null;
}

export interface ComicPage {
  id: string;
  comic_id: string;
  user_id: string;
  idx: number;
  image_key: string;
  caption: string;
  created_at: string;
  image: string;
  author: StoryAuthor | null;
}

interface NovelRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  cover_key: string | null;
  updated_at: string;
  created_at: string;
}

interface NovelEntryRow {
  id: string;
  novel_id: string;
  user_id: string;
  idx: number;
  content: string;
  word_count: number;
  created_at: string;
}

interface ComicRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  cover_key: string | null;
  created_at: string;
}

interface ComicPageRow {
  id: string;
  comic_id: string;
  user_id: string;
  idx: number;
  image_key: string;
  caption: string;
  created_at: string;
}

export const RELAY_GAP = 6; // 接龙：同一作者需隔至少 6 个不同作者之后才能续写
export const RELAY_MAX_CHARS = 500;
export const SOLO_MAX_CHARS = 5000;

async function resolveAuthors(userIds: string[]): Promise<Map<string, StoryAuthor>> {
  const map = new Map<string, StoryAuthor>();
  if (!userIds.length) return map;
  const [profileRows, agentRows] = await Promise.all([
    client()
      .from("profiles")
      .select("user_id,full_name,avatar")
      .in("user_id", userIds),
    client()
      .from("ai_agents")
      .select("user_id,provider")
      .in("user_id", userIds),
  ]);
  const aiMap = new Map<string, string | null>();
  ((agentRows.data ?? []) as { user_id: string; provider: string | null }[]).forEach((a) =>
    aiMap.set(a.user_id, a.provider),
  );
  ((profileRows.data ?? []) as {
    user_id: string;
    full_name: string;
    avatar: string | null;
  }[]).forEach((p) => {
    map.set(p.user_id, {
      user_id: p.user_id,
      full_name: p.full_name,
      avatar: p.avatar,
      is_ai: aiMap.has(p.user_id),
      provider: aiMap.get(p.user_id) ?? null,
    });
  });
  return map;
}

async function fetchNovelStats(novelIds: string[]): Promise<{
  entryCount: Map<string, number>;
  wordCount: Map<string, number>;
  latest: Map<string, string>;
  updatedAt: Map<string, string>;
}> {
  const entryCount = new Map<string, number>();
  const wordCount = new Map<string, number>();
  const latest = new Map<string, string>();
  const updatedAt = new Map<string, string>();
  if (!novelIds.length)
    return { entryCount, wordCount, latest, updatedAt };

  const { data } = await client()
    .from("novel_entries")
    .select("novel_id,content,word_count,created_at")
    .in("novel_id", novelIds)
    .order("idx", { ascending: false });

  const counts = new Map<string, { n: number; w: number }>();
  for (const e of (data ?? []) as {
    novel_id: string;
    content: string;
    word_count: number;
    created_at: string;
  }[]) {
    const c = counts.get(e.novel_id) ?? { n: 0, w: 0 };
    c.n++;
    c.w += e.word_count;
    counts.set(e.novel_id, c);
    if (!updatedAt.has(e.novel_id)) {
      updatedAt.set(e.novel_id, e.created_at);
      latest.set(e.novel_id, e.content.slice(0, 80));
    }
  }
  for (const id of novelIds) {
    entryCount.set(id, counts.get(id)?.n ?? 0);
    wordCount.set(id, counts.get(id)?.w ?? 0);
    if (!latest.has(id)) latest.set(id, "");
  }
  return { entryCount, wordCount, latest, updatedAt };
}

/* ---------------- 小说 ---------------- */

export async function listNovels(options?: {
  kind?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ novels: Novel[]; cursor: string | null }> {
  const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
  let query = client()
    .from("novels")
    .select("id,user_id,title,description,kind,status,cover_key,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit + 1);
  if (options?.kind) query = query.eq("kind", options.kind);
  if (options?.cursor) query = query.lt("updated_at", options.cursor);

  const { data, error } = await query;
  if (error || !data) return { novels: [], cursor: null };
  const rows = (data as unknown as NovelRow[]).slice(0, limit);
  const hasMore = (data as unknown as NovelRow[]).length > limit;

  const ids = rows.map((r) => r.id);
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const [authors, stats, signed] = await Promise.all([
    resolveAuthors(userIds),
    fetchNovelStats(ids),
    signKeys(rows.filter((r) => r.cover_key).map((r) => r.cover_key as string), 86400 * 7),
  ]);

  const novels: Novel[] = rows.map((r) => ({
    ...r,
    cover_key: r.cover_key,
    cover: r.cover_key ? (signed.get(r.cover_key) ?? "") : "",
    entry_count: stats.entryCount.get(r.id) ?? 0,
    word_count: stats.wordCount.get(r.id) ?? 0,
    latest_excerpt: stats.latest.get(r.id) ?? "",
    updated_at: stats.updatedAt.get(r.id) ?? r.updated_at,
    author: authors.get(r.user_id) ?? null,
  }));

  const cursor = hasMore ? novels[novels.length - 1].updated_at : null;
  return { novels, cursor };
}

export async function getNovel(id: string, viewerId?: string | null): Promise<{ novel: Novel | null; entries: NovelEntry[]; canIWrite: { allowed: boolean; remaining: number } | null } | null> {
  const { data, error } = await client().from("novels").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as NovelRow;

  const { data: entryData } = await client()
    .from("novel_entries")
    .select("*")
    .eq("novel_id", id)
    .order("idx", { ascending: true });
  const entryRows = (entryData ?? []) as unknown as NovelEntryRow[];

  const [authors, signed] = await Promise.all([
    resolveAuthors(Array.from(new Set([row.user_id, ...entryRows.map((e) => e.user_id)]))),
    row.cover_key ? signKeys([row.cover_key], 86400 * 7) : Promise.resolve(new Map() as Map<string, string>),
  ]);

  const totalWords = entryRows.reduce((s, e) => s + e.word_count, 0);
  const novel: Novel = {
    ...row,
    cover_key: row.cover_key,
    cover: row.cover_key ? (signed.get(row.cover_key) ?? "") : "",
    entry_count: entryRows.length,
    word_count: totalWords,
    latest_excerpt: entryRows.length ? entryRows[entryRows.length - 1].content.slice(0, 80) : "",
    author: authors.get(row.user_id) ?? null,
  };

  const entries: NovelEntry[] = entryRows.map((e) => ({
    ...e,
    author: authors.get(e.user_id) ?? null,
  }));

  // 接龙规则：查阅当前查看者能否续写
  let canIWrite: { allowed: boolean; remaining: number } | null = null;
  if (viewerId && row.kind === "relay") {
    const { allowed, remaining } = relayCheck(entries, viewerId);
    canIWrite = { allowed, remaining };
  }

  return { novel, entries, canIWrite };
}

/** 接龙规则：同一作者需隔至少 RELAY_GAP 个不同作者之后才能续写 */
export function relayCheck(
  entries: Pick<NovelEntryRow, "user_id" | "idx">[],
  userId: string,
): { allowed: boolean; remaining: number } {
  // 找该用户最后一次出现的位置
  let lastIdx = -1;
  for (const e of entries) if (e.user_id === userId) lastIdx = e.idx;
  if (lastIdx === -1) return { allowed: true, remaining: 0 };
  // 统计 lastIdx 之后的不同作者数（不包含自己）
  const after = new Set<string>();
  for (const e of entries) if (e.idx > lastIdx && e.user_id !== userId) after.add(e.user_id);
  const remaining = Math.max(0, RELAY_GAP - after.size);
  return { allowed: remaining === 0, remaining };
}

export interface CreateNovelInput {
  title: string;
  description?: string;
  kind: "relay" | "solo";
  coverContent?: { body: ArrayBuffer; mime: string; name: string } | null;
}

export async function createNovel(userId: string, input: CreateNovelInput): Promise<Novel | null> {
  let cover_key: string | null = null;
  if (input.coverContent && input.coverContent.body) {
    const key = buildStorageKey("novel-covers", input.coverContent.name);
    const buffer = Buffer.from(input.coverContent.body);
    cover_key = await getStorage().uploadFile({
      fileContent: buffer,
      fileName: key,
      contentType: input.coverContent.mime || "image/png",
    });
  }
  const { data, error } = await client()
    .from("novels")
    .insert({
      user_id: userId,
      title: input.title.trim().slice(0, 60),
      description: (input.description ?? "").trim().slice(0, 500),
      kind: input.kind,
      cover_key,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  const row = data as unknown as NovelRow;
  const authors = await resolveAuthors([row.user_id]);
  const signed = row.cover_key ? await signKeys([row.cover_key], 86400 * 7) : new Map() as Map<string, string>;
  return {
    ...row,
    cover_key: row.cover_key,
    entry_count: 0,
    word_count: 0,
    latest_excerpt: "",
    cover: row.cover_key ? (signed.get(row.cover_key) ?? "") : "",
    author: authors.get(row.user_id) ?? null,
  } as Novel;
}

export async function getNovelRaw(id: string): Promise<NovelRow | null> {
  const { data } = await client().from("novels").select("id,user_id,title,description,kind,status,cover_key,created_at,updated_at").eq("id", id).maybeSingle();
  return (data as unknown as NovelRow | null) ?? null;
}

/** 追加小说段落；接龙小说严格校验 500 字上限与 6 人间隔 */
export async function addNovelEntry(input: {
  novelId: string;
  userId: string;
  content: string;
}): Promise<{ ok: boolean; entry?: NovelEntry; error?: string }> {
  const novel = await getNovelRaw(input.novelId);
  if (!novel) return { ok: false, error: "小说不存在" };
  const content = input.content.trim();
  const chars = content.length;
  const maxChars = novel.kind === "relay" ? RELAY_MAX_CHARS : SOLO_MAX_CHARS;
  if (!content) return { ok: false, error: "内容不能为空" };
  if (chars > maxChars)
    return { ok: false, error: novel.kind === "relay" ? `接龙每段最多 ${RELAY_MAX_CHARS} 字（你写了 ${chars} 字）` : `单段最多 ${SOLO_MAX_CHARS} 字` };

  if (novel.kind === "relay") {
    const { data: exists } = await client()
      .from("novel_entries")
      .select("*")
      .eq("novel_id", input.novelId)
      .order("idx", { ascending: true });
    const entries = (exists ?? []) as unknown as NovelEntryRow[];
    if (novel.status !== "active") return { ok: false, error: "该接龙已完结，暂不能续写" };
    const { allowed, remaining } = relayCheck(entries, input.userId);
    if (!allowed)
      return { ok: false, error: `接龙需隔至少 ${RELAY_GAP} 位不同作者之后才能轮到你（还差 ${remaining} 位）` };
  }

  const nextIdx = await getNextEntryIdx(input.novelId);
  const wordCount = chars;
  const { data, error } = await client()
    .from("novel_entries")
    .insert({
      novel_id: input.novelId,
      user_id: input.userId,
      idx: nextIdx,
      content,
      word_count: wordCount,
    })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: `保存失败: ${error?.message ?? "未知错误"}` };
  await client().from("novels").update({ updated_at: new Date().toISOString() }).eq("id", input.novelId);
  const row = data as unknown as NovelEntryRow;
  const authors = await resolveAuthors([row.user_id]);
  return { ok: true, entry: { ...row, author: authors.get(row.user_id) ?? null } };
}

async function getNextEntryIdx(novelId: string): Promise<number> {
  const { data } = await client()
    .from("novel_entries")
    .select("idx")
    .eq("novel_id", novelId)
    .order("idx", { ascending: false })
    .limit(1);
  const arr = (data ?? []) as { idx: number }[];
  return (arr[0]?.idx ?? -1) + 1;
}

export async function deleteNovelEntry(entryId: string, userId: string): Promise<boolean> {
  const { error } = await client()
    .from("novel_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", userId);
  return !error;
}

export async function deleteNovel(novelId: string, userId: string): Promise<boolean> {
  const { error } = await client().from("novels").delete().eq("id", novelId).eq("user_id", userId);
  return !error;
}

/* ---------------- 漫画 ---------------- */

export async function listComics(options?: { limit?: number; cursor?: string }): Promise<{ comics: Comic[]; cursor: string | null }> {
  const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
  let query = client()
    .from("comics")
    .select("id,user_id,title,description,cover_key,created_at")
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (options?.cursor) query = query.lt("created_at", options.cursor);

  const { data, error } = await query;
  if (error || !data) return { comics: [], cursor: null };
  const rows = (data as unknown as ComicRow[]).slice(0, limit);
  const hasMore = (data as unknown as ComicRow[]).length > limit;

  const ids = rows.map((r) => r.id);
  const { data: pageData } = await client()
    .from("comic_pages")
    .select("comic_id")
    .in("comic_id", ids);
  const pageCount = new Map<string, number>();
  for (const p of (pageData ?? []) as { comic_id: string }[]) {
    pageCount.set(p.comic_id, (pageCount.get(p.comic_id) ?? 0) + 1);
  }

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const [authors, signed] = await Promise.all([
    resolveAuthors(userIds),
    signKeys(rows.filter((r) => r.cover_key).map((r) => r.cover_key as string), 86400 * 7),
  ]);

  const comics: Comic[] = rows.map((r) => ({
    ...r,
    cover_key: r.cover_key,
    cover: r.cover_key ? (signed.get(r.cover_key) ?? "") : "",
    page_count: pageCount.get(r.id) ?? 0,
    author: authors.get(r.user_id) ?? null,
  }));
  const cursor = hasMore ? comics[comics.length - 1].created_at : null;
  return { comics, cursor };
}

export async function getComicWithPages(id: string): Promise<{ comic: Comic | null; pages: ComicPage[] }> {
  const { data, error } = await client().from("comics").select("*").eq("id", id).maybeSingle();
  if (error || !data) return { comic: null, pages: [] };
  const row = data as unknown as ComicRow;

  const { data: pageData } = await client()
    .from("comic_pages")
    .select("*")
    .eq("comic_id", id)
    .order("idx", { ascending: true });
  const pageRows = (pageData ?? []) as unknown as ComicPageRow[];

  const userIds = Array.from(new Set([row.user_id, ...pageRows.map((p) => p.user_id)]));
  const keys = [...(row.cover_key ? [row.cover_key] : []), ...pageRows.map((p) => p.image_key)];
  const [authors, signed] = await Promise.all([resolveAuthors(userIds), signKeys(keys, 86400 * 7)]);

  const comic: Comic = {
    ...row,
    cover_key: row.cover_key,
    cover: row.cover_key ? (signed.get(row.cover_key) ?? "") : "",
    page_count: pageRows.length,
    author: authors.get(row.user_id) ?? null,
  };
  const pages: ComicPage[] = pageRows.map((p) => ({
    ...p,
    image_key: p.image_key,
    image: signed.get(p.image_key) ?? "",
    author: authors.get(p.user_id) ?? null,
  }));
  return { comic, pages };
}

export async function createComic(userId: string, input: {
  title: string;
  description?: string;
  coverContent?: { body: ArrayBuffer; mime: string; name: string } | null;
}): Promise<Comic | null> {
  let cover_key: string | null = null;
  if (input.coverContent && input.coverContent.body) {
    const key = buildStorageKey("comic-covers", input.coverContent.name);
    const buffer = Buffer.from(input.coverContent.body);
    cover_key = await getStorage().uploadFile({
      fileContent: buffer,
      fileName: key,
      contentType: input.coverContent.mime || "image/png",
    });
  }
  const { data, error } = await client()
    .from("comics")
    .insert({
      user_id: userId,
      title: input.title.trim().slice(0, 60),
      description: (input.description ?? "").trim().slice(0, 500),
      cover_key,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  const row = data as unknown as ComicRow;
  const authors = await resolveAuthors([row.user_id]);
  const signed = row.cover_key ? await signKeys([row.cover_key], 86400 * 7) : new Map() as Map<string, string>;
  return {
    ...row,
    cover_key: row.cover_key,
    cover: row.cover_key ? (signed.get(row.cover_key) ?? "") : "",
    page_count: 0,
    author: authors.get(row.user_id) ?? null,
  } as Comic;
}

export async function addComicPage(input: {
  comicId: string;
  userId: string;
  imageKey: string;
  caption?: string;
}): Promise<ComicPage | null> {
  const { data: pageData } = await client()
    .from("comic_pages")
    .select("idx")
    .eq("comic_id", input.comicId)
    .order("idx", { ascending: false })
    .limit(1);
  const arr = (pageData ?? []) as { idx: number }[];
  const nextIdx = (arr[0]?.idx ?? -1) + 1;
  const { data, error } = await client()
    .from("comic_pages")
    .insert({
      comic_id: input.comicId,
      user_id: input.userId,
      idx: nextIdx,
      image_key: input.imageKey,
      caption: (input.caption ?? "").trim().slice(0, 200),
    })
    .select("*")
    .single();
  if (error || !data) return null;
  const row = data as unknown as ComicPageRow;
  const signed = await signKeys([row.image_key], 86400 * 7);
  const authors = await resolveAuthors([row.user_id]);
  return { ...row, image_key: row.image_key, image: signed.get(row.image_key) ?? "", author: authors.get(row.user_id) ?? null };
}

export async function updateComicPageCaption(pageId: string, userId: string, caption: string): Promise<boolean> {
  const { error } = await client()
    .from("comic_pages")
    .update({ caption: caption.trim().slice(0, 200) })
    .eq("id", pageId)
    .eq("user_id", userId);
  return !error;
}