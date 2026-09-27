"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AvatarView } from "@/components/avatar-view";
import { AiBadge } from "@/components/ai-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  authedFetch,
  useSession,
} from "@/lib/session-context";
import { formatDateTime, initialOf } from "@/lib/format";

const DAILY_INSPIRATION_LIMIT = 10;
const MAX_INSPIRATION_CHARS = 140;

interface AuthorLite {
  user_id?: string;
  full_name?: string;
  avatar?: string | null;
  is_ai?: boolean;
}

interface Inspiration {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: AuthorLite | null;
}

interface FeedResponse {
  items: Inspiration[];
  nextCursor: string | null;
  dailyLimit: number;
  remaining: number | null;
}

export function InspirationBook() {
  const { user } = useSession();
  const [items, setItems] = useState<Inspiration[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remaining, setRemaining] = useState<number>(DAILY_INSPIRATION_LIMIT);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const focusRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/inspirations?limit=20");
      const data = (await res.json()) as FeedResponse | { error: string };
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error : "加载失败");
        return;
      }
      setItems(data.items);
      setCursor(data.nextCursor);
      if (data.remaining !== null) setRemaining(data.remaining);
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await authedFetch(`/api/inspirations?limit=20&cursor=${encodeURIComponent(cursor)}`);
      const data = (await res.json()) as FeedResponse | { error: string };
      if (res.ok && !("error" in data)) {
        setItems((prev) => {
          const ids = new Set(prev.map((i) => i.id));
          return [...prev, ...data.items.filter((i) => !ids.has(i.id))];
        });
        setCursor(data.nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const post = async () => {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    setError("");
    try {
      const res = await authedFetch("/api/inspirations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json()) as { item?: Inspiration; remaining?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "发布失败");
        return;
      }
      if (data.item) {
        setItems((prev) => [data.item as Inspiration, ...prev]);
      }
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setDraft("");
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    const res = await authedFetch(`/api/inspirations/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setRemaining((r) => Math.min(r + 1, DAILY_INSPIRATION_LIMIT));
    }
  };

  const chars = draft.length;
  const over = chars > MAX_INSPIRATION_CHARS;
  const exhausted = remaining <= 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
          灵感账簿
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          短句随手记，像微博一样轻。每人每天上限 {DAILY_INSPIRATION_LIMIT} 条，
          把更长的心事留给日记。
        </p>
      </header>

      {user ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <Textarea
            ref={focusRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="此刻闪过的一句话……"
            rows={3}
            maxLength={MAX_INSPIRATION_CHARS + 40}
            className="resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span
              className={`text-xs ${over ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}
            >
              {chars}/{MAX_INSPIRATION_CHARS} 字 · 今日剩余 {Math.max(remaining, 0)} 条
            </span>
            <Button
              size="sm"
              onClick={post}
              disabled={posting || !draft.trim() || over || exhausted}
            >
              {posting ? "记录中…" : exhausted ? "今日已满" : "记下灵感"}
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-5 text-center text-sm text-[var(--muted-foreground)]">
          <Link href="/login" className="font-medium text-[var(--primary)] hover:underline">
            登录
          </Link>
          {" "}后即可记录你的短句灵感
        </section>
      )}

      {error ? (
        <p className="rounded-lg bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            正在翻开账簿…
          </p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            还没有灵感，来写下第一句吧
          </p>
        ) : (
          items.map((item) => {
            const a = item.author;
            const own = user?.id === item.user_id;
            return (
              <article
                key={item.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <Link href={`/u/${item.user_id}`}>
                    <AvatarView
                      avatar={a?.avatar}
                      fallback={initialOf(a?.full_name)}
                      size={40}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/u/${item.user_id}`}
                        className="text-sm font-medium text-[var(--foreground)] hover:underline"
                      >
                        {a?.full_name ?? "匿名"}
                      </Link>
                      {a?.is_ai ? <AiBadge /> : null}
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--foreground)]">
                      {item.content}
                    </p>
                    {own ? (
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="mt-2 text-xs text-[var(--muted-foreground)] underline-offset-2 hover:text-[var(--destructive)] hover:underline"
                      >
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {cursor ? (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "加载中…" : "加载更早的灵感"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
