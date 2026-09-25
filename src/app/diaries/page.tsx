"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, CalendarDays, Loader2, PenLine, ChevronLeft, ChevronRight, Archive, X } from "lucide-react";
import { useSession, authedFetch } from "@/lib/session-context";
import { DiaryCard } from "@/components/diary-card";
import { Diary } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE = 12;

interface ArchiveItem {
  ym: string;
  count: number;
}

export default function MyDiariesPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [year, setYear] = useState<number | undefined>();
  const [month, setMonth] = useState<number | undefined>();
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadingData(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (year) params.set("year", String(year));
      if (month) params.set("month", String(month));
      if (keyword) params.set("keyword", keyword);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE));
      const res = await authedFetch(`/api/diaries?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setDiaries(data.diaries ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoadingData(false);
    }
  }, [year, month, keyword, page]);

  const loadArchive = useCallback(async () => {
    try {
      const res = await authedFetch("/api/diaries/archive");
      const data = await res.json();
      if (res.ok) setArchive(data.archive ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  // 未登录重定向
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      load();
      loadArchive();
    }
  }, [user, load, loadArchive]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  const selectArchive = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    setYear(y);
    setMonth(m);
    setPage(1);
  };

  const clearFilter = () => {
    setYear(undefined);
    setMonth(undefined);
    setSearchInput("");
    setKeyword("");
    setPage(1);
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const filterActive = year !== undefined || keyword !== "";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      {/* 侧栏：归档 + 搜索 */}
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div className="diary-paper rounded-2xl border border-border/70 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Search className="h-4 w-4 text-primary" /> 搜索日记
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setKeyword(searchInput.trim());
              setPage(1);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="标题或内容关键词…"
                className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              搜索
            </button>
          </form>
        </div>

        <div className="diary-paper rounded-2xl border border-border/70 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
            <Archive className="h-4 w-4 text-primary" /> 按时间归档
          </h2>
          {archive.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无归档</p>
          ) : (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
              {archive.map((item) => {
                const [y, m] = item.ym.split("-").map(Number);
                const active = year === y && month === m;
                return (
                  <li key={item.ym}>
                    <button
                      onClick={() => selectArchive(item.ym)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span>{y}年{m}月</span>
                      <span>{item.count} 篇</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* 主体列表 */}
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">我的日记</h1>
            {filterActive && (
              <button
                onClick={clearFilter}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> 清除筛选
              </button>
            )}
          </div>
          <button
            onClick={() => router.push("/write")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <PenLine className="h-4 w-4" /> 写日记
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {loadingData ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : diaries.length === 0 ? (
          <div className="diary-paper rounded-2xl border border-border/70 p-10 text-center">
            <p className="text-muted-foreground">
              {filterActive ? "没有匹配的日记" : "还没有写过日记"}
            </p>
            {!filterActive && (
              <button
                onClick={() => router.push("/write")}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                <PenLine className="h-4 w-4" /> 写下第一篇
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {diaries.map((d) => (
              <DiaryCard key={d.id} diary={d} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" /> 上一页
            </button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              下一页 <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}