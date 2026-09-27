"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  DRINK_CATEGORIES,
  listDrinks,
  drinkTagline,
  drinkPrompt,
  drinkImage,
  drinkCategoryLabel,
  barBackgroundImage,
  type Drink,
} from "@/lib/drinks";

export default function BarClient() {
  const all = useMemo(() => listDrinks(), []);
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Drink | null>(null);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return all.filter((d) => {
      if (cat !== "all" && d.category !== cat) return false;
      if (!kw) return true;
      const hay = [
        d.name,
        drinkTagline(d),
        drinkCategoryLabel(d),
        d.description,
        drinkPrompt(d),
        d.keywords.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(kw);
    });
  }, [all, cat, q]);

  return (
    <div className="relative min-h-screen py-6">
      {/* 氛围背景 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image
          src={barBackgroundImage()}
          alt=""
          fill
          className="object-cover opacity-[0.18]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/60 via-[var(--background)]/80 to-[var(--background)]" />
      </div>
      <header className="mb-6 text-center">
        <p className="mb-1 text-sm tracking-widest text-[var(--muted-foreground)]">
          THE MIDNIGHT BAR
        </p>
        <h1 className="font-serif text-3xl font-bold text-[var(--foreground)]">
          深夜酒吧
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          架子上摆着 {all.length} 款名字稀奇的酒。挑一杯读它的说明与关键词，
          再借它的味道写点什么——心情日记、诗、散文，形式都由你。
        </p>
      </header>

      {/* 搜索 + 分类 */}
      <div className="mb-5 flex flex-col gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜名字、口味或关键词，如：日落 / 桂花 / 气泡"
          className="h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <div className="flex flex-wrap justify-center gap-2">
          <CatButton
            active={cat === "all"}
            onClick={() => setCat("all")}
            label={`全部 ${all.length}`}
          />
          {DRINK_CATEGORIES.map((c) => (
            <CatButton
              key={c.id}
              active={cat === c.id}
              onClick={() => setCat(c.id)}
              label={`${c.label} ${all.filter((d) => d.category === c.id).length}`}
            />
          ))}
        </div>
      </div>

      {/* 酒卡网格 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((d) => (
          <button
            key={d.slug}
            onClick={() => setActive(d)}
            className="group flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative mb-2 h-28 w-28 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]">
              <Image
                src={drinkImage(d)}
                alt={d.name}
                fill
                className="object-cover transition group-hover:scale-105"
                sizes="112px"
              />
            </div>
            <span className="font-serif text-base font-semibold text-[var(--foreground)]">
              {d.name}
            </span>
            <span className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
              {drinkCategoryLabel(d)} · {d.abv}%vol
            </span>
            <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--muted-foreground)]">
              {drinkTagline(d)}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-[var(--muted-foreground)]">
          没有找到这杯酒，换个词试试。
        </p>
      )}

      {active && (
        <DrinkModal drink={active} onClose={() => setActive(null)} />
      )}
    </div>
  );
}

function CatButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--ring)]"
      }`}
    >
      {label}
    </button>
  );
}

function DrinkModal({
  drink,
  onClose,
}: {
  drink: Drink;
  onClose: () => void;
}) {
  const href = `/write?drink=${encodeURIComponent(drink.slug)}`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)] shadow-inner">
            <Image
              src={drinkImage(drink)}
              alt={drink.name}
              fill
              className="object-cover"
              sizes="128px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--muted-foreground)]">
              {drinkCategoryLabel(drink)} · {drink.abv}%vol
            </p>
            <h2 className="font-serif text-2xl font-bold text-[var(--foreground)]">
              {drink.name}
            </h2>
            <p className="mt-1 text-sm italic text-[var(--muted-foreground)]">
              {drinkTagline(drink)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-[var(--muted-foreground)]">
            关键词
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {drink.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full border border-[var(--border)] bg-[var(--muted)] px-2.5 py-0.5 text-xs text-[var(--accent-foreground)]"
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-[var(--muted-foreground)]">
            这杯酒的说明
          </h3>
          <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">
            {drink.description}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)] p-3">
          <h3 className="mb-1 text-xs font-semibold tracking-wider text-[var(--muted-foreground)]">
            写作灵感 prompt
          </h3>
          <p className="text-sm leading-6 text-[var(--foreground)]">
            {drinkPrompt(drink)}
          </p>
        </div>

        <div className="mt-5 flex gap-2">
          <Link
            href={href}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-medium text-white transition hover:opacity-90"
          >
            就用这杯写点什么
          </Link>
          <Link
            href="/diaries"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            我的日记
          </Link>
        </div>
      </div>
    </div>
  );
}
