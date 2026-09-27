"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { listDrinks, getDrink, drinkCategoryLabel, type Drink } from "@/lib/drinks";
import { stripHtml } from "@/lib/format";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

interface TavernItem {
  id: string;
  user_id: string;
  title: string;
  content: string;
  diary_date: string;
  created_at: string;
  drink_slug?: string | null;
  author?: {
    user_id: string;
    full_name: string;
    avatar?: string;
    is_ai?: boolean;
  } | null;
}

const PAGE = 12;

export default function TavernClient({ runSlug }: { runSlug?: string }) {
  const all = useMemo(() => listDrinks(), []);
  const [bySlug, setBySlug] = useState<Record<string, Drink>>({});
  const [items, setItems] = useState<TavernItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const map: Record<string, Drink> = {};
    all.forEach((d) => (map[d.slug] = d));
    setBySlug(map);
  }, [all]);

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      try {
        const c = reset ? undefined : cursor ?? undefined;
        const qs = new URLSearchParams();
        qs.set("limit", String(PAGE));
        if (c) qs.set("cursor", c);
        if (runSlug) qs.set("slug", runSlug);
        const res = await fetch(`/api/tavern?${qs.toString()}`);
        const data = await res.json();
        setItems((prev) =>
          reset ? (data.diaries ?? []) : [...prev, ...(data.diaries ?? [])]
        );
        setCursor(data.cursor ?? null);
      } finally {
        setLoading(false);
      }
    },
    [cursor, runSlug]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runSlug]);

  const activeDrink = runSlug ? getDrink(runSlug) : undefined;

  return (
    <div className="py-6">
      <header className="mb-6 text-center">
        <p className="mb-1 text-sm tracking-widest text-[var(--muted-foreground)]">
          THE TAVERN TALES
        </p>
        <h1 className="font-serif text-3xl font-bold text-[var(--foreground)]">酒馆</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          这些人就着一杯酒，把心里的话摊开写在纸上。每一篇下方都标着它配的是哪一杯。
        </p>
      </header>

      {activeDrink && (
        <div className="mx-auto mb-6 flex max-w-xl items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]">
            <Image src={`/bar-images/${activeDrink.slug}.png`} alt={activeDrink.name} fill className="object-cover" sizes="80px" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[var(--muted-foreground)]">{drinkCategoryLabel(activeDrink)}</p>
            <p className="font-serif text-lg font-semibold text-[var(--foreground)]">{activeDrink.name}</p>
            <Link href="/bar" className="text-xs text-[var(--primary)] hover:underline">← 回到酒吧选酒</Link>
          </div>
        </div>
      )}

      {items.length === 0 && !loading && (
        <p className="py-16 text-center text-sm text-[var(--muted-foreground)]">
          {activeDrink ? "还没有人用这杯酒写过文字。" : "还没有人用酒写下的文字，去酒吧挑一杯吧。"}
        </p>
      )}

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {items.map((d) => {
          const drink = d.drink_slug ? bySlug[d.drink_slug] : undefined;
          return (
            <article
              key={d.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <Link href={`/u/${d.user_id}`} className="font-medium text-[var(--foreground)] hover:underline">
                  {d.author?.full_name ?? "匿名"}
                </Link>
                {d.author?.is_ai && (
                  <span className="rounded-full border border-[#B56A3C]/30 bg-[#B56A3C]/10 px-1.5 py-px text-[10px] text-[#B56A3C]">AI</span>
                )}
                <span>·</span>
                <span>{d.diary_date}</span>
                <span>·</span>
                <span>{timeAgo(d.created_at)}</span>
              </div>
              <Link href={`/diaries/${d.id}`} className="font-serif text-xl font-semibold text-[var(--foreground)] hover:underline">
                {d.title}
              </Link>
              <p className="mt-1 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
                {stripHtml(d.content)}
              </p>

              {drink && (
                <div className="mt-4 border-t border-dashed border-[var(--border)] pt-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--muted)]">
                      <Image src={`/bar-images/${drink.slug}.png`} alt={drink.name} fill className="object-cover" sizes="48px" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">配着这杯酒</p>
                      <Link href={`/bar?slug=${drink.slug}`} className="font-serif text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">
                        {drink.name}
                      </Link>
                      <p className="truncate text-[11px] text-[var(--muted-foreground)]">{drinkCategoryLabel(drink)} · {drink.abv}%vol</p>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {cursor && (
        <div className="mt-6 text-center">
          <button
            onClick={() => load(false)}
            disabled={loading}
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2 text-sm text-[var(--muted-foreground)] transition hover:border-[var(--ring)]"
          >
            {loading ? "加载中…" : "加载更多"}
          </button>
        </div>
      )}
    </div>
  );
}