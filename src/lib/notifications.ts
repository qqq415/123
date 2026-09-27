import { client } from "./db";

export type NotificationType = "diary_comment" | "tarot_comment";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string;
  actor_is_ai: boolean;
  actor_name: string;
  actor_avatar: string | null;
  type: NotificationType;
  target_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string;
  actor_is_ai: boolean;
  type: string;
  target_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

function fallbackName(isAi: boolean): string {
  return isAi ? "AI 成员" : "某位成员";
}

async function decorate(rows: NotificationRow[]): Promise<AppNotification[]> {
  const humanIds = Array.from(new Set(rows.filter((r) => !r.actor_is_ai).map((r) => r.actor_id)));
  const aiIds = Array.from(new Set(rows.filter((r) => r.actor_is_ai).map((r) => r.actor_id)));
  const meta = new Map<string, { name: string; avatar: string | null }>();

  if (humanIds.length > 0) {
    const { data } = await client()
      .from("profiles")
      .select("user_id, full_name, avatar")
      .in("user_id", humanIds);
    for (const p of data ?? []) {
      meta.set(p.user_id, {
        name: p.full_name?.trim() || fallbackName(false),
        avatar: p.avatar ?? null,
      });
    }
  }
  if (aiIds.length > 0) {
    const { data } = await client()
      .from("ai_agents")
      .select("id, nickname, avatar")
      .in("id", aiIds);
    for (const a of data ?? []) {
      meta.set(a.id, {
        name: a.nickname?.trim() || fallbackName(true),
        avatar: a.avatar ?? null,
      });
    }
  }

  return rows.map((r) => {
    const m = meta.get(r.actor_id) ?? { name: fallbackName(r.actor_is_ai), avatar: null };
    return {
      id: r.id,
      user_id: r.user_id,
      actor_id: r.actor_id,
      actor_is_ai: r.actor_is_ai,
      actor_name: m.name,
      actor_avatar: m.avatar,
      type: r.type as NotificationType,
      target_id: r.target_id,
      content: r.content,
      is_read: r.is_read,
      created_at: r.created_at,
    };
  });
}

export async function createNotification(input: {
  userId: string;
  actorId: string;
  actorIsAi: boolean;
  type: NotificationType;
  targetId: string | null;
  content?: string;
}): Promise<void> {
  if (input.userId === input.actorId) return;
  const { error } = await client()
    .from("notifications")
    .insert({
      user_id: input.userId,
      actor_id: input.actorId,
      actor_is_ai: input.actorIsAi,
      type: input.type,
      target_id: input.targetId,
      content: input.content ?? "",
    });
  if (error) console.error("[notifications] create failed:", error.message);
}

export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<AppNotification[]> {
  const { data, error } = await client()
    .from("notifications")
    .select("id,user_id,actor_id,actor_is_ai,type,target_id,content,is_read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[notifications] list failed:", error.message);
    return [];
  }
  return decorate((data ?? []) as NotificationRow[]);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await client()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) {
    console.error("[notifications] count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await client()
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) console.error("[notifications] mark read failed:", error.message);
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  const { error } = await client()
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("id", notificationId);
  if (error) console.error("[notifications] mark one failed:", error.message);
}