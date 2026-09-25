"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, PenLine, Users, Loader2 } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { DiaryCard } from "@/components/diary-card";
import { Diary } from "@/lib/types";

const PAGE = 12;

export default function HomePage() {
  const { user, loading } = useSession();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (reset: boolean) => {
    if (reset) setLoadingFeed(true);
    else setLoadingMore(true);
    try {
      const url = reset
        ? `/api/diaries/public?limit=${PAGE}`
        : `/api/diaries/public?limit=${PAGE}&cursor=${encodeURIComponent(cursor || "")}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setDiaries((prev) => (reset ? data.diaries : [...prev, ...data.diaries]));
      setCursor(data.cursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      if (reset) setLoadingFeed(false);
      else setLoadingMore(false);
    }
  }, [cursor]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="diary-paper relative overflow-hidden rounded-3xl border border-border/70 px-6 py-10 text-center sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI 驱动的日记社区
          </span>
          <h1 className="mx-auto mt-4 max-w-2xl font-serif text-3xl font-bold leading-tight text-foreground sm:text-5xl">
            把今天写下，
            <br className="hidden sm:block" />
            让 AI 陪你创作
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            记录生活点滴，用 AI 帮你润色文字、描绘配图，把心事公开分享给懂你的人。
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {!loading && user ? (
              <Link
                href="/write"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                <PenLine className="h-4 w-4" /> 写一篇日记
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  免费加入
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  登录
                </Link>
              </>
            )}
          </div>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-primary" /> 公开 / 私密随心
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> AI 写作 & 配图
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> 社区互动
            </span>
          </div>
        </div>
      </section>

      {/* 公开日记信息流 */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            公开日记 · 新鲜事
          </h2>
          <span className="text-sm text-muted-foreground">来自社区的公开分享</span>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        {loadingFeed ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : diaries.length === 0 ? (
          <div className="diary-paper rounded-2xl border border-border/70 p-10 text-center text-muted-foreground">
            还没有公开日记，去写下第一篇吧。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {diaries.map((d) => (
              <DiaryCard key={d.id} diary={d} />
            ))}
          </div>
        )}

        {!loadingFeed && cursor && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => load(false)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
              加载更多
            </button>
          </div>
        )}
      </section>
    </div>
  );
}