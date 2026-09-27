"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/session-context";
import { TAROT_DECK, randomKeyword, tarotCardSymbol, type TarotCard } from "@/lib/tarot";

interface DrawData {
  id: string;
  user_id: string;
  card_id: number;
  draw_date: string;
  keyword: string;
  comment: string | null;
  created_at: string;
}

export default function TarotClient() {
  const { user } = useSession();
  const [today, setToday] = useState<DrawData | null>(null);
  const [history, setHistory] = useState<DrawData[]>([]);
  const [loading, setLoading] = useState(true);
  const [browsing, setBrowsing] = useState(false);
  const [rolling, setRolling] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tarot");
      const data = await res.json();
      setToday(data.today ?? null);
      setHistory(data.history ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-[var(--muted-foreground)]">洗牌中…</div>;
  }

  if (!user) {
    return (
      <div className="py-20 text-center">
        <p className="text-4xl">🔮</p>
        <p className="mt-3 text-base text-[var(--foreground)]">登录后就能抽一张今日塔罗</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">抽卡、转日运关键词滚筒、留言，都在这里。</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <header className="mb-6 text-center">
        <p className="mb-1 text-sm tracking-widest text-[var(--muted-foreground)]">DAILY TAROT</p>
        <h1 className="font-serif text-3xl font-bold text-[var(--foreground)]">每日塔罗</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          每天从 78 张牌中抽一张，看今日的指引。抽完转动「日运关键词滚筒」，为你挑出今天的那一个词。
        </p>
      </header>

      {today ? (
        <TodayView today={today} onRefresh={refresh} />
      ) : (
        <div className="mx-auto -mt-2 mb-8 flex max-w-md flex-col items-center gap-3 text-center">
          <button
            onClick={async () => {
              setLoading(true);
              await fetch("/api/tarot/draw", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
              await refresh();
              setLoading(false);
            }}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-sm font-medium text-white shadow hover:opacity-90"
          >
            🔮 随机抽一张今日塔罗
          </button>
          <button
            onClick={() => setBrowsing((v) => !v)}
            className="text-sm text-[var(--muted-foreground)] underline-offset-4 hover:text-[var(--primary)] hover:underline"
          >
            {browsing ? "收起牌堆" : "或从 78 张中自选一张"}
          </button>
        </div>
      )}

      {browsing && !today && <DeckPicker onPicked={() => setBrowsing(false)} />}

      {today && <HistoryList items={history} />}
    </div>
  );
}

/** 今日牌 + 滚筒 + 留言 */
function TodayView({ today, onRefresh }: { today: DrawData; onRefresh: () => Promise<void> }) {
  const card = TAROT_DECK.find((c) => c.id === today.card_id)!;
  const [keyword, setKeyword] = useState(today.keyword);
  const [spinning, setSpinning] = useState(false);
  const [comment, setComment] = useState(today.comment ?? "");
  const [saved, setSaved] = useState(Boolean(today.comment));
  const timerRef = useRef<number | null>(null);

  const spin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    const steps = 14;
    let k = 0;
    const picked = randomKeyword(card);
    setKeyword("");
    timerRef.current = window.setInterval(() => {
      k += 1;
      setKeyword(card.keywords[k % card.keywords.length]);
      if (k > steps) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setKeyword(picked);
        setSpinning(false);
        // 保存滚筒结果
        fetch("/api/tarot/draw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: picked }),
        }).catch(() => {});
      }
    }, 110);
  }, [spinning, card]);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const submitComment = async () => {
    const c = comment.trim();
    await fetch("/api/tarot/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: c || null }),
    });
    setSaved(true);
    onRefresh();
  };

  return (
    <div className="mx-auto mb-8 max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-md">
      <div className="text-center">
        <div className="mx-auto flex h-40 w-28 flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-b from-[#3B2F2A] to-[#241b17] text-[var(--card)] shadow-lg">
          <span className="text-3xl">{tarotCardSymbol(card)}</span>
          <span className="mt-2 font-serif text-2xl font-bold">{card.number}</span>
          <span className="mt-1 font-serif text-lg">{card.name}</span>
        </div>
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">今日牌 · {card.arcana === "major" ? "大阿卡纳" : `小阿卡纳·${suitName(card.suit)}`}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--foreground)]">{card.meaning}</p>
        <p className="mt-1 text-xs italic text-[var(--muted-foreground)]">{card.advice}</p>
      </div>

      {/* 关键词滚筒 */}
      <div className="mt-5 text-center">
        <p className="mb-2 text-xs font-semibold tracking-widest text-[var(--muted-foreground)]">日运关键词滚筒</p>
        <div className="mx-auto flex h-14 max-w-[240px] items-center justify-center overflow-hidden rounded-xl border-2 border-[var(--border)] bg-[var(--muted)]">
          <span className={`font-serif text-xl font-bold text-[var(--foreground)] ${spinning ? "opacity-60" : ""}`}>
            {keyword || "—"}
          </span>
        </div>
        <button
          onClick={spin}
          disabled={spinning}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-5 text-sm text-[var(--foreground)] hover:border-[var(--ring)]"
        >
          {spinning ? "转动中…" : "🎰 再转一次"}
        </button>
      </div>

      {/* 留言 */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold tracking-widest text-[var(--muted-foreground)]">
          为今日日运留一句话（可跳过）
        </p>
        <textarea
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSaved(false); }}
          maxLength={200}
          rows={2}
          placeholder="写下此刻的心情，或想对今天说的话…"
          className="w-full resize-none rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <div className="mt-2 text-right">
          <button
            onClick={submitComment}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-5 text-sm text-white hover:opacity-90"
          >
            {saved ? "已保存" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function suitName(suit?: string): string {
  return ({ wands: "权杖", cups: "圣杯", swords: "宝剑", pentacles: "星币" } as Record<string, string>)[suit ?? ""] ?? "";
}

/** 自选牌堆 */
function DeckPicker({ onPicked }: { onPicked: () => void }) {
  const groups: { label: string; cards: TarotCard[] }[] = [
    { label: "大阿卡纳", cards: TAROT_DECK.filter((c) => c.arcana === "major") },
    { label: "权杖", cards: TAROT_DECK.filter((c) => c.suit === "wands") },
    { label: "圣杯", cards: TAROT_DECK.filter((c) => c.suit === "cups") },
    { label: "宝剑", cards: TAROT_DECK.filter((c) => c.suit === "swords") },
    { label: "星币", cards: TAROT_DECK.filter((c) => c.suit === "pentacles") },
  ];

  function pick(card: TarotCard) {
    void fetch("/api/tarot/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: card.id }),
    });
    onPicked();
    window.location.reload();
  }

  return (
    <div className="mx-auto mb-8 max-w-3xl">
      <p className="mb-3 text-center text-sm text-[var(--muted-foreground)]">点一张牌，今天就是它。</p>
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <div key={g.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="mb-2 text-xs font-semibold text-[var(--muted-foreground)]">{g.label} · {g.cards.length}</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
              {g.cards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pick(c)}
                  className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-1 py-2 text-center transition hover:border-[var(--ring)] hover:bg-[var(--muted)]"
                  title={c.meaning}
                >
                  <span className="text-lg">{tarotCardSymbol(c)}</span>
                  <span className="mt-1 text-[11px] font-medium leading-tight text-[var(--foreground)]">{c.number} {c.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 历史列表 */
function HistoryList({ items }: { items: DrawData[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-3 text-center text-xs font-semibold tracking-widest text-[var(--muted-foreground)]">近期记录</p>
      {items.length === 0 && <p className="text-center text-sm text-[var(--muted-foreground)]">还没有记录。</p>}
      <div className="flex flex-col gap-2">
        {items.map((d) => {
          const card = TAROT_DECK.find((c) => c.id === d.card_id);
          return (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
              <span className="text-lg">{card ? tarotCardSymbol(card) : "🂠"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {card?.number} {card?.name}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)]">{d.draw_date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--primary)]">{d.keyword}</p>
                {d.comment && <p className="max-w-[200px] truncate text-[11px] text-[var(--muted-foreground)]">{d.comment}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}