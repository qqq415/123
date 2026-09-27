import { client, fetchProfiles, type Profile } from "@/lib/db";
import { getTarotCard, type TarotCard } from "@/lib/tarot";

/** 东八区今天的日期字符串 */
export function tarotDateNow(): string {
  const shifted = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export interface TarotDraw {
  id: string;
  user_id: string;
  card_id: number;
  draw_date: string;
  keyword: string;
  comment: string | null;
  created_at: string;
  card?: TarotCard;
  author?: Profile | null;
}

interface TarotRow {
  id: string;
  user_id: string;
  card_id: number;
  draw_date: string;
  keyword: string;
  comment: string | null;
  created_at: string;
}

function rowOf(r: TarotRow): TarotDraw {
  return {
    id: r.id,
    user_id: r.user_id,
    card_id: r.card_id,
    draw_date: r.draw_date,
    keyword: r.keyword,
    comment: r.comment,
    created_at: r.created_at,
    card: getTarotCard(r.card_id),
  };
}

async function decorate(rows: TarotRow[]): Promise<TarotDraw[]> {
  if (!rows.length) return [];
  const authors = await fetchProfiles(rows.map((r) => r.user_id));
  return rows.map((r) => ({
    ...rowOf(r),
    author: authors.get(r.user_id) ?? null,
  }));
}

/** 某人某天的抽卡（不存在返回 null） */
export async function getTodaysDraw(userId: string): Promise<TarotDraw | null> {
  const { data, error } = await client()
    .from("tarot_draws")
    .select("*")
    .eq("user_id", userId)
    .eq("draw_date", tarotDateNow())
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`查询抽卡失败: ${error.message}`);
  const rows = (data ?? []) as TarotRow[];
  if (!rows.length) return null;
  return (await decorate(rows))[0];
}

/** 过去 N 天的抽卡历史（最新在前） */
export async function getDrawHistory(userId: string, limit = 30): Promise<TarotDraw[]> {
  const { data, error } = await client()
    .from("tarot_draws")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`查询抽卡历史失败: ${error.message}`);
  return decorate((data ?? []) as TarotRow[]);
}

/** 抽取并保存今日牌（upsert 当日，只保留第一条） */
export async function createDraw(userId: string, cardId: number, keyword: string): Promise<TarotDraw> {
  const today = tarotDateNow();
  // 并发保护：先查当日是否已有
  const existing = await getTodaysDraw(userId);
  if (existing) return existing;
  const { data, error } = await client()
    .from("tarot_draws")
    .insert({ user_id: userId, card_id: cardId, keyword, draw_date: today, comment: null })
    .select()
    .single();
  if (error) throw new Error(`保存抽卡失败: ${error.message}`);
  return rowOf(data as TarotRow);
}

/** 给当日抽卡留言（不留言则 comment 为 null） */
export async function setDrawComment(userId: string, comment: string): Promise<TarotDraw | null> {
  const today = tarotDateNow();
  const { data, error } = await client()
    .from("tarot_draws")
    .update({ comment })
    .eq("user_id", userId)
    .eq("draw_date", today)
    .select()
    .single();
  if (error) throw new Error(`留言失败: ${error.message}`);
  if (!data) return null;
  return rowOf(data as TarotRow);
}

/** 仅留言：不更新牌，用于主页展示时补充备注 */
export async function updateDrawComment(userId: string, comment: string): Promise<TarotDraw | null> {
  return setDrawComment(userId, comment);
}