import { client, fetchProfiles, type Profile } from "@/lib/db";

export const DAILY_INSPIRATION_LIMIT = 10;
export const MAX_INSPIRATION_CHARS = 140;

/** 使用东八区日期作为“今天”，保证日上限按同一日期口径计算 */
export function inspirationDateNow(): string {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export interface Inspiration {
  id: string;
  user_id: string;
  content: string;
  insp_date: string;
  created_at: string;
  author?: Profile | null;
}

interface InspirationRow {
  id: string;
  user_id: string;
  content: string;
  insp_date: string;
  created_at: string;
}

function rowOf(r: InspirationRow): Inspiration {
  return {
    id: r.id,
    user_id: r.user_id,
    content: r.content,
    insp_date: r.insp_date,
    created_at: r.created_at,
  };
}

async function decorate(rows: InspirationRow[]): Promise<Inspiration[]> {
  if (!rows.length) return [];
  const authors = await fetchProfiles(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...rowOf(r),
    author: authors.get(r.user_id) ?? null,
  }));
}

/** 公共灵感信息流（最新在前） */
export async function getInspirationFeed(options: {
  limit?: number;
  cursor?: string;
  userId?: string;
}): Promise<{ items: Inspiration[]; nextCursor: string | null }> {
  const limit = options.limit ?? 30;
  let q = client()
    .from("inspirations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  if (options.userId) q = q.eq("user_id", options.userId);
  if (options.cursor) q = q.lt("created_at", options.cursor);

  const { data, error } = await q;
  if (error) throw new Error(`查询灵感失败: ${error.message}`);
  const rows = (data ?? []) as InspirationRow[];
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  return {
    items: await decorate(page),
    nextCursor: hasMore && page.length ? page[page.length - 1].created_at : null,
  };
}

/** 某用户某日已发条数 */
export async function countTodayInspirations(userId: string, date: string): Promise<number> {
  const { count, error } = await client()
    .from("inspirations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("insp_date", date);
  if (error) throw new Error(`统计灵感失败: ${error.message}`);
  return count ?? 0;
}

/** 发布一条灵感（已通过鉴权与上限校验时调用） */
export async function insertInspiration(input: {
  userId: string;
  content: string;
  date: string;
}): Promise<Inspiration> {
  const { data, error } = await client()
    .from("inspirations")
    .insert({ user_id: input.userId, content: input.content, insp_date: input.date })
    .select("*")
    .single();
  if (error) throw new Error(`发布灵感失败: ${error.message}`);
  const rows = await decorate([data as InspirationRow]);
  return rows[0];
}

/** 删除自己的灵感 */
export async function deleteInspiration(input: { id: string; userId: string }): Promise<void> {
  const { error } = await client()
    .from("inspirations")
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId);
  if (error) throw new Error(`删除灵感失败: ${error.message}`);
}

/** 最近一条灵感（供 AI 调度去重/上下文） */
export async function getLatestInspiration(userId: string): Promise<Inspiration | null> {
  const { data, error } = await client()
    .from("inspirations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`查询最近灵感失败: ${error.message}`);
  if (!data) return null;
  return rowOf(data as InspirationRow);
}
