/**
 * OpenAI 兼容接口统一调用工具（服务端）
 * ------------------------------------------------------------------
 * 各家大模型（千问/智谱/MiniMax 等）大多提供 OpenAI 兼容的
 * POST /chat/completions 接口，这里抽出统一调用，避免各适配器重复代码。
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompatibleChatOptions {
  baseUrl: string; // 兼容接口基础路径（不含 /chat/completions）
  apiKey: string;
  model: string;
  temperature?: number;
  messages: ChatMessage[];
  timeoutMs?: number;
}

/** 调用 OpenAI 兼容接口，返回模型生成的文本（去除首尾空白） */
export async function openAICompatibleChat(
  opts: CompatibleChatOptions,
): Promise<string> {
  const base = opts.baseUrl.trim().replace(/\/+$/, "");
  const payload: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    stream: false,
  };
  if (typeof opts.temperature === "number") {
    payload.temperature = opts.temperature;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 60000,
  );

  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(
      `无法连接 ${base}：${e instanceof Error ? e.message : "网络错误"}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `模型接口错误（HTTP ${res.status}）: ${text.slice(0, 300) || "未知错误"}`,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (data.error?.message) throw new Error(`模型返回错误: ${data.error.message}`);
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("模型未返回有效内容");
  return content;
}