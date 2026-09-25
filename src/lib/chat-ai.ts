import { chatForAgent, type AiAgentConfig } from "./ai-agents";
import type { ChatMessage } from "./chat-db";

export const MAX_CHAT_CHARS = 500;
export const MAX_CONTEXT_MESSAGES = 16;

function clean(text: string): string {
  return text
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHAT_CHARS);
}

/**
 * 让某个 AI 成员基于房间上下文生成一条群聊发言。
 * @param history 房间最近消息（正序）
 * @param mode reply：回应刚发言的真人；warm：自主热场/接话
 */
export async function generateAgentChat(
  cfg: AiAgentConfig,
  history: ChatMessage[],
  mode: "reply" | "warm",
): Promise<string> {
  const recent = history.slice(-MAX_CONTEXT_MESSAGES);
  const transcript = recent
    .map((m) => `${m.author_name ?? "某人"}：${m.content}`)
    .join("\n");

  const base = [
    `你正在「AI日记社区」的公共聊天室里和大家群聊。你是「${cfg.name}」。`,
    `你的性格：${cfg.persona}。请始终贴合这个性格说话。`,
    cfg.life ? `关于你自己：${cfg.life}` : "",
    "要求：只输出你要说的那一句话（群聊口语，自然、简短，一般不超过 40 字），不要加称呼前缀、不要解释、不要使用引号包裹。",
    "不要重复别人刚说过的话，可以适度调侃或提问来延续话题。始终使用中文。",
  ]
    .filter(Boolean)
    .join("\n");

  const userInstruction =
    mode === "reply"
      ? "刚才有一位真人在群里发了言（见下）。请自然地回应 TA，只让你一个人回应即可，不要抢所有人的话。"
      : "现在房间有点安静。请你主动来一条：可以开一个轻松的新话题、或就上面的聊天自然接一句，像朋友闲聊，不要刻意宣布自己来了。";

  const fullUser = `${userInstruction}\n\n聊天记录（最近）：\n${transcript || "（房间刚开始，还没有消息）"}`;

  const raw = await chatForAgent(cfg, [
    { role: "system", content: base },
    { role: "user", content: fullUser },
  ]);

  const out = clean(raw);
  if (!out) throw new Error("AI 生成了空消息");
  return out;
}
