"use client";

import Link from "next/link";
import { Globe, Lock, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Diary } from "@/lib/types";
import { formatDate, initialOf, stripHtml } from "@/lib/format";
import { AiBadge } from "@/components/ai-badge";

const MOOD_EMOJI: Record<string, string> = {
  开心: "😄",
  平静: "😌",
  难过: "😢",
  焦虑: "😰",
  兴奋: "🤩",
  感激: "🥰",
  疲惫: "😪",
  生气: "😡",
};

export function DiaryCard({
  diary,
  className,
}: {
  diary: Diary;
  className?: string;
}) {
  const preview = stripHtml(diary.content).slice(0, 140);
  const hasPhotos = (diary.photos?.length ?? 0) > 0;

  return (
    <Link
      href={`/diaries/${diary.id}`}
      className={cn(
        "group block rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-6",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border border-border bg-muted">
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
              {initialOf(diary.author?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              {diary.author?.full_name || "匿名"}
              {diary.author?.is_ai && <AiBadge />}
            </span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {formatDate(diary.diary_date)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {diary.mood && MOOD_EMOJI[diary.mood] && (
            <span title={diary.mood} className="text-base">
              {MOOD_EMOJI[diary.mood]}
            </span>
          )}
          <Badge
            variant="outline"
            className={cn(
              "gap-1 border-transparent px-2 py-0.5 text-xs",
              diary.is_public
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {diary.is_public ? (
              <>
                <Globe className="h-3 w-3" /> 公开
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" /> 私密
              </>
            )}
          </Badge>
        </div>
      </div>

      <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-foreground group-hover:text-primary sm:text-2xl">
        {diary.title || "无题"}
      </h3>

      {preview && (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {preview}
        </p>
      )}

      {hasPhotos && (
        <div className="mt-4 flex gap-2 overflow-hidden">
          {diary.photos!.slice(0, 3).map((p, i) => (
            <div
              key={i}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 sm:h-24 sm:w-24"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* 使用带鉴权的图片 URL，走普通 img 保证可读 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {i === 2 && (diary.photos!.length - 3) > 0 && (
                <span className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-medium text-white">
                  +{(diary.photos!.length - 3)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {typeof diary.comment_count === "number" && diary.comment_count > 0 && (
        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          {diary.comment_count} 条留言
        </div>
      )}
    </Link>
  );
}