import { client } from "./db";

/** 聊天室消息（含作者信息） */
export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  source: "human" | "ai";
  created_at: string;
  author_name?: string;
  avatar?: string;
  is_ai?: boolean;
}

interface ChatMessageRow {
  id: string;
  user_id: string;
  content: string;
  source: string;
  created_at: string;
}

const PAGE_SIZE = 50;

/**
 * 读取聊天室历史消息（正序：旧 -> 新）。
 * @param beforeId 可选：读取该消息之前的历史（用于上拉加载更多）
 */
export async function getChatHistory(beforeId?: string): Promise<ChatMessage[]> {
  let q = client()
    .from("chat_messages")
    .select("id, user_id, content, source, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  if (beforeId) {
    const row = await client()
      .from("chat_messages")
      .select("created_at")
      .eq("id", beforeId)
      .single();
    if (!row.error && row.data?.created_at) {
      q = q.lt("created_at", row.data.created_at as string);
    }
  }

  const { data, error } = await q;
  if (error) throw new Error(`读取聊天记录失败: ${error.message}`);

  const rows = (data as ChatMessageRow[]).slice().reverse();
  return decorate(rows);
}

/**
 * 增量轮询：读取指定时间戳之后的新消息（正序）。
 */
export async function getChatAfter(
  afterCreatedAt: string,
): Promise<ChatMessage[]> {
  const { data, error } = await client()
    .from("chat_messages")
    .select("id, user_id, content, source, created_at")
    .gt("created_at", afterCreatedAt)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(PAGE_SIZE);
  if (error) throw new Error(`读取新消息失败: ${error.message}`);
  return decorate(data as ChatMessageRow[]);
}

/** 写入一条聊天消息（真人或 AI），返回落库消息 */
export async function insertChatMessage(params: {
  userId: string;
  content: string;
  source: "human" | "ai";
}): Promise<ChatMessage> {
  const { data, error } = await client()
    .from("chat_messages")
    .insert({
      user_id: params.userId,
      content: params.content,
      source: params.source,
    })
    .select("id, user_id, content, source, created_at")
    .single();
  if (error) throw new Error(`发送消息失败: ${error.message}`);
  const [m] = await decorate([data as ChatMessageRow]);
  return m;
}

/** 最近一条消息的时间戳（用于调度判断冷场） */
export async function getLastChatMessage(): Promise<ChatMessageRow | null> {
  const { data, error } = await client()
    .from("chat_messages")
    .select("id, user_id, content, source, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`读取最新消息失败: ${error.message}`);
  return (data as ChatMessageRow) ?? null;
}

/** 为一批消息补全作者昵称/头像/AI 标识（批量，避免 N+1） */
async function decorate(rows: ChatMessageRow[]): Promise<ChatMessage[]> {
  if (!rows.length) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const [pRes, aRes] = await Promise.all([
    client()
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds),
    client()
      .from("ai_agents")
      .select("user_id, name, avatar")
      .in("user_id", userIds),
  ]);

  const profileMap = new Map<string, string>();
  if (!pRes.error) {
    (pRes.data as { user_id: string; full_name: string }[]).forEach((p) =>
      profileMap.set(p.user_id, p.full_name),
    );
  }
  const aiMap = new Map<string, { name: string; avatar: string }>();
  if (!aRes.error) {
    (aRes.data as { user_id: string; name: string; avatar: string }[]).forEach(
      (a) => aiMap.set(a.user_id, { name: a.name, avatar: a.avatar }),
    );
  }

  return rows.map((r) => {
    const ai = aiMap.get(r.user_id);
    const isAi = r.source === "ai" || !!ai;
    return {
      id: r.id,
      user_id: r.user_id,
      content: r.content,
      source: (isAi ? "ai" : "human") as "ai" | "human",
      created_at: r.created_at,
      author_name: ai?.name ?? profileMap.get(r.user_id) ?? "日记人",
      avatar: ai?.avatar ?? undefined,
      is_ai: isAi,
    };
  });
}
