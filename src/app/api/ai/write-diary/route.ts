import { NextRequest } from "next/server";
import { LLMClient, HeaderUtils } from "coze-coding-dev-sdk";
import { makeCozeConfig } from "@/lib/coze-config";

export async function POST(request: NextRequest) {
  const { topic, mood, tone } = await request.json().catch(() => ({}));

  if (!topic || !String(topic).trim()) {
    return new Response(JSON.stringify({ error: "请提供日记主题或灵感" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = makeCozeConfig();
  const client = new LLMClient(config, customHeaders);

  const moodText = mood ? `，心情基调是「${mood}」` : "";
  const toneText = tone ? `，语气偏向「${tone}」` : "";
  const system = `你是一位温柔细腻的中文日记写作助手。请根据用户提供的主题/灵感${moodText}${toneText}，写一篇真挚、自然、有画面感的第一人称日记（400字左右）。用中文输出正文即可，不要加标题，不要加“今天”开头的套话开场白过多重复，直接以叙述切入。`;
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: String(topic).trim() },
  ];

  const stream = client.stream(messages, {
    model: "doubao-seed-2-0-pro-260215",
    temperature: 1.0,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.content?.toString() ?? "";
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: (err as Error)?.message ?? "生成失败" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}