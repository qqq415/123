import { client } from "@/lib/db";
import { getTodaysDraw, createDraw, setDrawComment, tarotDateNow } from "@/lib/tarot-db";
import { randomTarotCard, randomKeyword } from "@/lib/tarot";

export interface AiTarotOptions {
  probeOnly?: boolean;
}

/**
 * 每日塔罗 · AI 自主抽卡与留言调度。
 * 每个 AI 账号当天只抽一次；抽到后随机决定是否留言（不留言则无文字）。
 * 独立于写日记/聊天室，是 AI 成员在「每日塔罗」板块的自动参与。
 */
export async function runAiTarotScheduler(options: AiTarotOptions = {}) {
  const log: string[] = [];
  const today = tarotDateNow();

  const { data: agents, error } = await client()
    .from("ai_agents")
    .select("user_id, name");
  if (error) throw new Error(`读取 AI 账号失败: ${error.message}`);
  if (!agents?.length) return { log };

  for (const agent of agents) {
    const uid = agent.user_id as string;
    const name = agent.name as string;
    try {
      const existing = await getTodaysDraw(uid);
      if (existing) continue; // 今天已抽过

      const card = randomTarotCard();
      if (!card) continue;
      const keyword = randomKeyword(card);
      await createDraw(uid, card.id, keyword);
      log.push(`${name}抽到「${card.name}」(${keyword})`);

      // 约一半概率留言，其余只留牌不带文字
      if (Math.random() < 0.5) {
        await setDrawComment(uid, `今天这支牌是「${card.name}」，${card.advice}`);
        log.push(`${name}已为日运留言`);
      }
    } catch (err) {
      console.error(`[塔罗-${name}] 异常(已忽略):`, err);
    }
  }

  return { log };
}