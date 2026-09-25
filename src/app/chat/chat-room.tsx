"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiBadge } from "@/components/ai-badge";
import { useSession, authedFetch } from "@/lib/session-context";
import type { ChatMessage } from "@/lib/chat-db";

const POLL_INTERVAL_MS = 4000;

/** 相对时间（分钟前 / 小时前 / 月日） */
function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const d = new Date(t);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function ChatRoom() {
  const { user, loading } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToBottom = useRef(true);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // 初始加载历史
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/chat", { cache: "no-store" });
        const data = (await res.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };
        if (!alive) return;
        if (data.messages) setMessages(data.messages);
        if (data.error) setError(data.error);
      } catch {
        if (alive) setError("加载聊天记录失败");
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 增量轮询
  useEffect(() => {
    if (!loaded) return;
    const timer = setInterval(async () => {
      const current = messagesRef.current;
      const after = current.length
        ? current[current.length - 1].created_at
        : new Date(0).toISOString();
      try {
        const res = await fetch(`/api/chat?after=${encodeURIComponent(after)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          messages?: ChatMessage[];
          error?: string;
        };
        if (data.messages?.length) {
          setMessages((prev) => mergeMessages(prev, data.messages!));
        }
      } catch {
        // 单次轮询失败忽略，下一轮继续
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loaded]);

  // 新消息时，若贴底则自动滚动
  useEffect(() => {
    if (stickToBottom.current) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    stickToBottom.current = atBottom;
  }, []);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await authedFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as {
        message?: ChatMessage;
        error?: string;
      };
      if (!res.ok || !data.message) {
        setError(data.error ?? "发送失败");
        return;
      }
      setMessages((prev) => mergeMessages(prev, [data.message!]));
      setDraft("");
      stickToBottom.current = true;
    } catch {
      setError("网络异常，请重试");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <header className="mb-3 flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            社区聊天室
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            和真人、AI 同伴围坐一桌，随便聊聊
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          实时中
        </span>
      </header>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="diary-paper flex-1 space-y-4 overflow-y-auto rounded-2xl border border-border p-4 shadow-sm"
      >
        {!loaded ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            正在走进房间…
          </p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="font-serif text-lg">房间刚刚点亮，还没有人说话</p>
            <p className="text-sm text-muted-foreground">
              {user ? "发第一句，AI 同伴会接住你的话" : "登录后说第一句吧"}
            </p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {loading ? null : user ? (
          <>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              maxLength={500}
              placeholder="说点什么…（Enter 发送）"
              className="h-11 flex-1 rounded-xl border border-input bg-card px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              onClick={() => void send()}
              disabled={sending || !draft.trim()}
              className="h-11 rounded-xl px-5"
            >
              <Send className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">发送</span>
            </Button>
          </>
        ) : (
          <div className="flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-accent underline-offset-2 hover:underline">
              登录
            </Link>
            <span className="ml-1">后即可加入聊天</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAi = !!message.is_ai;
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${
          isAi ? "bg-secondary" : "bg-muted"
        }`}
        aria-hidden
      >
        {isAi ? message.avatar || "🤖" : "✍️"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-foreground">
            {message.author_name}
          </span>
          {isAi && <AiBadge />}
          <span className="text-xs text-muted-foreground">
            {timeAgo(message.created_at)}
          </span>
        </div>
        <p className="mt-0.5 break-words text-sm leading-relaxed text-foreground/90">
          {message.content}
        </p>
      </div>
    </div>
  );
}

/** 按 id 去重合并，保持正序 */
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  prev.forEach((m) => map.set(m.id, m));
  incoming.forEach((m) => map.set(m.id, m));
  return Array.from(map.values()).sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );
}
