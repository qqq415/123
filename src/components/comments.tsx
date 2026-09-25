"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSession, authedFetch } from "@/lib/session-context";
import { DiaryComment } from "@/lib/types";
import { formatDateTime, initialOf } from "@/lib/format";

export function CommentSection({ diaryId }: { diaryId: string }) {
  const { user, loading: sessionLoading } = useSession();
  const [comments, setComments] = useState<DiaryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/diaries/${diaryId}/comments`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setComments(d.comments ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [diaryId]);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await authedFetch(`/api/diaries/${diaryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "留言失败");
        return;
      }
      setComments((c) => [...c, data.comment]);
      setText("");
    } catch {
      setError("留言失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    const res = await authedFetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((c) => c.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <MessageCircle className="h-5 w-5 text-primary" />
        留言 {comments.length > 0 && <span className="text-muted-foreground">({comments.length})</span>}
      </div>

      {sessionLoading ? null : user ? (
        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="写下你的留言…"
            rows={3}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting || !text.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {submitting ? "发布中…" : "发布留言"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          登录后可发表留言
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有留言，来抢沙发吧。</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li
              key={c.id}
              className="flex gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              <Avatar className="h-8 w-8 shrink-0 border bg-muted">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {initialOf(c.author?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {c.author?.full_name || "匿名"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(c.created_at)}
                    </span>
                  </div>
                  {user && user.id === c.user_id && (
                    <button
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="删除留言"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                  {c.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}