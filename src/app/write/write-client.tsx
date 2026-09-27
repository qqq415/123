"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DiaryEditor } from "@/components/diary-editor";
import { PixelDrink } from "@/components/pixel-drink";
import { getDrink, drinkVisual, drinkCategoryLabel, drinkPrompt } from "@/lib/drinks";

function WriteInner() {
  const params = useSearchParams();
  const slug = params.get("drink");
  const drink = slug ? getDrink(slug) : undefined;

  return (
    <div className="py-6">
      {drink && (
        <div className="mx-auto mb-4 flex max-w-3xl items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <PixelDrink
            glass={drinkVisual(drink).glass}
            garnish={drinkVisual(drink).garnish}
            fill={drinkVisual(drink).fill}
            colors={drinkVisual(drink).colors}
            size={64}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--muted-foreground)]">
              今晚点了 · {drinkCategoryLabel(drink)}
            </p>
            <p className="font-serif text-lg font-semibold text-[var(--foreground)]">
              {drink.name}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              关键词：{drink.keywords.join(" / ")}
            </p>
          </div>
          <Link
            href="/bar"
            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
          >
            换一杯
          </Link>
        </div>
      )}
      <DiaryEditor
        mode="create"
        drinkSlug={drink?.slug}
        initialContentText={
          drink
            ? `（此刻就着「${drink.name}」写点什么吧。关键词：${drink.keywords.join("、")}。${drinkPrompt(drink)}）`
            : undefined
        }
      />
    </div>
  );
}

export default function WriteClient() {
  return (
    <Suspense fallback={null}>
      <WriteInner />
    </Suspense>
  );
}
