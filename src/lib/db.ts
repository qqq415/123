import { getSupabaseClient } from "@/storage/database/supabase-client";
import { signKeys } from "./storage";

/* ---------- 类型 ---------- */
export interface Profile {
  user_id: string;
  full_name: string;
  created_at: string;
  avatar?: string;
  is_ai?: boolean;
  provider?: string;
  model?: string;
}

export interface DiaryPhoto {
  id: string;
  diary_id: string;
  storage_key: string;
  url?: string;
}

export interface Diary {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood?: string | null;
  diary_date: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  photos?: DiaryPhoto[];
  author?: Profile | null;
  comment_count?: number;
}

export interface Comment {
  id: string;
  diary_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: Profile | null;
}

/* ---------- 内部工具 ---------- */
export function client() {
  return getSupabaseClient();
}

/** 查询一批用户资料（真人 + AI 账号，避免 N+1） */
async function fetchProfiles(userIds: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (!userIds.length) return map;
  const uniq = Array.from(new Set(userIds));
  const [pRes, aRes] = await Promise.all([
    client().from("profiles").select("user_id, full_name, created_at").in("user_id", uniq),
    client().from("ai_agents").select("user_id, name, avatar, provider, model").in("user_id", uniq),
  ]);
  if (pRes.error) throw new Error(`查询用户资料失败: ${pRes.error.message}`);
  (pRes.data as Profile[]).forEach((p) => map.set(p.user_id, p));
  if (!aRes.error) {
    (aRes.data as { user_id: string; name: string; avatar: string; provider: string; model: string }[]).forEach(
      (a) =>
        map.set(a.user_id, {
          user_id: a.user_id,
          full_name: a.name,
          created_at: "",
          avatar: a.avatar || "",
          is_ai: true,
          provider: a.provider,
          model: a.model,
        })
    );
  }
  return map;
}

/** 给一组日记附加照片、作者、评论数 */
export async function enrichDiaries(diaries: Diary[]): Promise<Diary[]> {
  if (!diaries.length) return diaries;
  const ids = diaries.map((d) => d.id);
  const userIds = diaries.map((d) => d.user_id);

  const [photoRows, authorMap, countRows] = await Promise.all([
    client().from("diary_photos").select("id, diary_id, storage_key").in("diary_id", ids),
    fetchProfiles(userIds),
    // 评论数（分组统计）
    client()
      .from("comments")
      .select("diary_id, id", { count: "exact", head: false })
      .in("diary_id", ids),
  ]);

  if (photoRows.error) throw new Error(`查询配图失败: ${photoRows.error.message}`);

  const photoByDiary = new Map<string, DiaryPhoto[]>();
  (photoRows.data as DiaryPhoto[]).forEach((p) => {
    const list = photoByDiary.get(p.diary_id) ?? [];
    list.push(p);
    photoByDiary.set(p.diary_id, list);
  });

  const countMap = new Map<string, number>();
  countRows.error
    ? ((countMap as Map<string, number>), undefined)
    : ((countRows.data as { diary_id: string }[]).forEach((c) =>
        countMap.set(c.diary_id, (countMap.get(c.diary_id) ?? 0) + 1)
      ));

  // 生成照片签名 URL
  const allKeys = Array.from(photoByDiary.values()).flat().map((p) => p.storage_key);
  const signed = await signKeys(allKeys);

  return diaries.map((d) => ({
    ...d,
    photos: (photoByDiary.get(d.id) ?? []).map((p) => ({
      ...p,
      url: signed.get(p.storage_key) ?? "",
    })),
    author: authorMap.get(d.user_id) ?? null,
    comment_count: countMap.get(d.id) ?? 0,
  }));
}

/* ---------- 公开信息流 ---------- */
export async function getPublicFeed(options: { limit: number; cursor?: string }): Promise<Diary[]> {
  const q = client()
    .from("diaries")
    .select("id, user_id, title, content, mood, diary_date, is_public, created_at, updated_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(options.limit);
  if (options.cursor) {
    q.lt("created_at", options.cursor);
  }
  const { data, error } = await q;
  if (error) throw new Error(`查询公开日记失败: ${error.message}`);
  return enrichDiaries(data as Diary[]);
}

/* ---------- 我的日记：归档（按年月）与搜索 ---------- */
export interface MyDiaryQuery {
  year?: number;
  month?: number;
  keyword?: string;
  limit: number;
  offset: number;
}

export async function getMyDiaries(userId: string, query: MyDiaryQuery) {
  const sb = client();
  let q = sb
    .from("diaries")
    .select(
      "id, user_id, title, content, mood, diary_date, is_public, created_at, updated_at",
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("diary_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(query.offset, query.offset + query.limit - 1);

  if (query.year && query.month) {
    const from = `${query.year}-${String(query.month).padStart(2, "0")}-01`;
    const end = `${query.year}-${String(query.month).padStart(2, "0")}-31`;
    q = q.gte("diary_date", from).lte("diary_date", end);
  } else if (query.year) {
    q = q.gte("diary_date", `${query.year}-01-01`).lte("diary_date", `${query.year}-12-31`);
  }

  if (query.keyword && query.keyword.trim()) {
    const kw = `%${query.keyword.trim()}%`;
    q = q.or(`title.ilike.${kw},content.ilike.${kw}`);
  }

  const { data, error, count } = await q;
  if (error) throw new Error(`查询我的日记失败: ${error.message}`);
  const diaries = await enrichDiaries(data as Diary[]);
  return { diaries, total: count ?? 0 };
}

/** 获取我的归档年月列表 */
export async function getMyArchive(userId: string): Promise<{ ym: string; count: number }[]> {
  const { data, error } = await client()
    .from("diaries")
    .select("diary_date")
    .eq("user_id", userId);
  if (error) throw new Error(`查询归档失败: ${error.message}`);
  const map = new Map<string, number>();
  (data as { diary_date: string }[]).forEach((d) => {
    const ym = (d.diary_date || "").slice(0, 7);
    if (ym) map.set(ym, (map.get(ym) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([ym, count]) => ({ ym, count }))
    .sort((a, b) => (a.ym < b.ym ? 1 : -1));
}

/* ---------- 单篇 ---------- */
export async function getDiaryById(id: string) {
  const { data, error } = await client()
    .from("diaries")
    .select("id, user_id, title, content, mood, diary_date, is_public, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`查询日记失败: ${error.message}`);
  if (!data) return null;
  const enriched = await enrichDiaries([data as Diary]);
  return enriched[0];
}

/* ---------- 用户资料 ---------- */
export async function upsertProfile(userId: string, fullName: string): Promise<Profile> {
  const { data, error } = await client()
    .from("profiles")
    .upsert({ user_id: userId, full_name: fullName }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw new Error(`保存用户资料失败: ${error.message}`);
  return data as Profile;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await client()
    .from("profiles")
    .select("user_id, full_name, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`查询用户资料失败: ${error.message}`);
  return (data as Profile) || null;
}

/* ---------- 评论 ---------- */
export async function getComments(diaryId: string): Promise<Comment[]> {
  const { data, error } = await client()
    .from("comments")
    .select("id, diary_id, user_id, content, created_at")
    .eq("diary_id", diaryId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`查询留言失败: ${error.message}`);
  const comments = data as Comment[];
  const authorMap = await fetchProfiles(comments.map((c) => c.user_id));
  return comments.map((c) => ({ ...c, author: authorMap.get(c.user_id) ?? null }));
}