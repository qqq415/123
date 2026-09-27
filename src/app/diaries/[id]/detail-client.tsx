"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Globe,
  Pencil,
  Trash2,
  MessageCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AvatarView } from "@/components/avatar-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommentSection } from "@/components/comments";
import { AiBadge } from "@/components/ai-badge";
import { useSession, authedFetch } from "@/lib/session-context";
import { Diary } from "@/lib/types";
import { formatDate, formatDateTime, initialOf } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export function DiaryDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { user, loading: sessionLoading } = useSession();

  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    authedFetch(`/api/diaries/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.error) setError(d.error);
        else setDiary(d.diary);
      })
      .catch(() => setError("加载失败"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const isOwner = !!user && diary?.user_id === user.id;

  const removeDiary = async () => {
    setDeleting(true);
    const res = await authedFetch(`/api/diaries/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/diaries");
      router.refresh();
    }
    setDeleting(false);
  };

  const toggleVisibility = async () => {
    if (toggling) return;
    setToggling(true);
    const next = !diary?.is_public;
    try {
      const res = await authedFetch(`/api/diaries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "修改权限失败");
        return;
      }
      setDiary((prev) => (prev ? { ...prev, is_public: next } : prev));
    } catch {
      setError("修改权限失败");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error || "日记不存在"}</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <article className="diary-paper overflow-hidden rounded-2xl border border-border/70 shadow-sm">
        <div className="border-b border-border/50 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AvatarView
                avatar={
                  diary.author?.is_ai
                    ? diary.author.avatar
                    : diary.author?.avatar
                }
                fallback={initialOf(diary.author?.full_name)}
                size={36}
              />
              <div className="text-sm">
                <div className="inline-flex items-center gap-2 font-medium text-foreground">
                  {diary.author?.full_name || "匿名"}
                  {diary.author?.is_ai && (
                    <>
                      <AiBadge />
                      <span className="text-xs font-normal text-muted-foreground">
                        由 AI 创作
                      </span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(diary.created_at)} 更新
                  {diary.updated_at && diary.updated_at !== diary.created_at
                    ? ` · ${formatDate(diary.updated_at.slice(0, 10))} 修改`
                    : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {diary.mood && MOOD_EMOJI[diary.mood] && (
                <span title={diary.mood} className="text-xl">
                  {MOOD_EMOJI[diary.mood]}
                </span>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 border-transparent",
                  diary.is_public ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
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
          <h1 className="mt-4 font-serif text-2xl font-bold leading-snug text-foreground sm:text-3xl">
            {diary.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            记于 {formatDate(diary.diary_date)}
          </p>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {/* 正文（富文本） */}
          <div
            className="prose-diary"
            dangerouslySetInnerHTML={{ __html: diary.content }}
          />

          {/* 配图 */}
          {diary.photos && diary.photos.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {diary.photos.map((p) => (
                <div
                  key={p.key}
                  className="overflow-hidden rounded-xl border border-border/60 bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="配图" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}

          {(!diary.content || diary.content === "<p></p>") &&
            (!diary.photos || diary.photos.length === 0) && (
              <p className="text-muted-foreground">（暂无内容）</p>
            )}

          {isOwner && (
            <div className="mt-8 flex items-center gap-3 border-t border-border/50 pt-5">
              <Button onClick={() => router.push(`/diaries/${id}/edit`)}>
                <Pencil className="mr-1.5 h-4 w-4" /> 编辑
              </Button>
              <Button
                variant="outline"
                onClick={() => void toggleVisibility()}
                disabled={toggling}
              >
                {diary.is_public ? (
                  <>
                    <Lock className="mr-1.5 h-4 w-4" />
                    {toggling ? "设置中…" : "设为私密"}
                  </>
                ) : (
                  <>
                    <Globe className="mr-1.5 h-4 w-4" />
                    {toggling ? "设置中…" : "设为公开"}
                  </>
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1.5 h-4 w-4" /> 删除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确定删除这篇日记？</AlertDialogTitle>
                    <AlertDialogDescription>
                      删除后无法恢复，配图与所有留言将一并删除。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={removeDiary}
                      disabled={deleting}
                    >
                      {deleting ? "删除中…" : "删除"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </article>

      {/* 评论区 */}
      {diary.is_public && (
        <section className="mt-8" id="comments">
          <CommentSection diaryId={diary.id} />
        </section>
      )}
    </div>
  );
}