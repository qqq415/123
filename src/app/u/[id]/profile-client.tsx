"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AvatarView } from "@/components/avatar-view";
import { AiBadge } from "@/components/ai-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  authedFetch,
  useSession,
} from "@/lib/session-context";
import { formatDateTime, formatDate, initialOf, stripHtml } from "@/lib/format";
import { getDrink } from "@/lib/drinks";

interface DiaryLite {
  id: string;
  title: string;
  content: string;
  diary_date: string;
  mood?: string | null;
  drink_slug?: string | null;
  created_at: string;
}

interface InspirationLite {
  id: string;
  content: string;
  created_at: string;
}

interface ProfileData {
  user_id: string;
  full_name: string;
  avatar?: string | null;
  is_ai?: boolean;
  bio?: string | null;
  provider?: string | null;
  created_at?: string | null;
  ai_slug?: string | null;
}

interface UserPageResponse {
  profile: ProfileData & { ai_slug?: string };
  diaries: DiaryLite[];
  inspirations: InspirationLite[];
  barPieces: DiaryLite[];
}

const EMOJI_CHOICES = [
  "📖", "🌙", "☕", "🌿", "🌊", "🫧", "🌸", "🍀", "🦉", "🐋",
  "🦊", "🐻", "🪶", "✨", "🎐", "🍑", "🫐", "🌽", "🫘", "🧠",
  "💡", "🐚", "📚", "🫛",
];

export function ProfileClient({ userId }: { userId: string }) {
  const { user, refresh } = useSession();
  const [data, setData] = useState<UserPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch(`/api/users/${userId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = (await res.json()) as UserPageResponse | { error: string };
      if (!res.ok || "error" in json) {
        setError("error" in json ? json.error : "加载失败");
        return;
      }
      setData(json as UserPageResponse);
    } catch {
      setError("网络异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-[var(--muted-foreground)]">
        正在打开主页…
      </p>
    );
  }
  if (notFound) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-[var(--muted-foreground)]">这个用户不存在</p>
        <Link href="/" className="mt-4 inline-block text-sm text-[var(--primary)] hover:underline">
          回到首页
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <p className="py-16 text-center text-sm text-[var(--destructive)]">{error}</p>
    );
  }

  const profile = data.profile as ProfileData;
  const isOwn = user?.id === profile.user_id;
  const aiSlug = profile.ai_slug ?? "";

  const saveName = async () => {
    const name = nameValue.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const url = profile.is_ai ? "/api/ai/name" : "/api/profile";
      const body = profile.is_ai
        ? { slug: aiSlug, name }
        : { fullName: name };
      const res = await authedFetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingName(false);
        await load();
        if (isOwn) await refresh();
      } else {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "保存失败");
      }
    } finally {
      setSaving(false);
    }
  };

  const setEmojiAvatar = async (emoji: string) => {
    setBusy(true);
    setError("");
    try {
      const url = profile.is_ai ? "/api/ai/avatar" : "/api/profile/avatar";
      const body = profile.is_ai ? { slug: aiSlug, avatar: emoji } : { avatar: emoji };
      const res = await authedFetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowEmoji(false);
        await load();
        if (isOwn) await refresh();
      } else {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "头像更新失败");
      }
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (profile.is_ai) fd.append("slug", aiSlug);
      const url = profile.is_ai ? "/api/ai/avatar" : "/api/profile/avatar";
      const res = await authedFetch(url, { method: "POST", body: fd });
      if (res.ok) {
        await load();
        if (isOwn) await refresh();
      } else {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "上传失败");
      }
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void uploadAvatar(f);
    e.target.value = "";
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <AvatarView
            avatar={profile.avatar}
            fallback={initialOf(profile.full_name)}
            size={84}
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
                {profile.full_name}
              </h1>
              {profile.is_ai ? <AiBadge /> : null}
            </div>
            {profile.bio ? (
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {profile.bio}
              </p>
            ) : null}
            <p className="text-xs text-[var(--muted-foreground)]">
              {profile.is_ai
                ? `AI 成员 · ${profile.provider ?? ""}`
                : `加入于 ${profile.created_at ? formatDate(profile.created_at.slice(0, 10)) : ""}`}
            </p>
          </div>
        </div>

        {isOwn ? (
          <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex flex-wrap gap-2">
              {!editingName ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNameValue(profile.full_name);
                    setEditingName(true);
                  }}
                >
                  修改昵称
                </Button>
              ) : (
                <span className="flex items-center gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    maxLength={24}
                    className="h-9 w-44"
                    autoFocus
                  />
                  <Button size="sm" onClick={saveName} disabled={saving}>
                    保存
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingName(false)}
                  >
                    取消
                  </Button>
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmoji((v) => !v)}
                disabled={busy}
              >
                换表情头像
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                上传本地照片
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickFile}
              />
            </div>
            {showEmoji ? (
              <div className="flex max-w-md flex-wrap gap-1.5">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmojiAvatar(e)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--muted)] text-lg transition hover:bg-[var(--accent)]"
                  >
                    {e}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-[var(--destructive)]">{error}</p>
        ) : null}
      </section>

      <Tabs defaultValue="diaries">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="diaries">公开日记 ({data.diaries.length})</TabsTrigger>
          <TabsTrigger value="inspirations">
            公开灵感 ({data.inspirations.length})
          </TabsTrigger>
          <TabsTrigger value="bar">酒馆文字 ({data.barPieces.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="diaries" className="space-y-3 pt-4">
          {data.diaries.length === 0 ? (
            <Empty text="还没有公开日记" />
          ) : (
            data.diaries.map((d) => <DiaryRow key={d.id} diary={d} />)
          )}
        </TabsContent>

        <TabsContent value="inspirations" className="space-y-3 pt-4">
          {data.inspirations.length === 0 ? (
            <Empty text="还没有公开灵感" />
          ) : (
            data.inspirations.map((ins) => (
              <article
                key={ins.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm shadow-sm"
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed text-[var(--foreground)]">
                  {ins.content}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {formatDateTime(ins.created_at)}
                </p>
              </article>
            ))
          )}
        </TabsContent>

        <TabsContent value="bar" className="space-y-3 pt-4">
          {data.barPieces.length === 0 ? (
            <Empty text="还没有在酒馆写下的文字" />
          ) : (
            data.barPieces.map((d) => {
              const drink = getDrink(d.drink_slug);
              return (
                <article
                  key={d.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[var(--accent-foreground)]">
                      {drink ? drink.name : "酒馆特调"}
                    </span>
                    <span>{formatDateTime(d.created_at)}</span>
                  </div>
                  <Link
                    href={`/diaries/${d.id}`}
                    className="mt-2 block font-medium text-[var(--foreground)] hover:underline"
                  >
                    {d.title}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                    {stripHtml(d.content)}
                  </p>
                </article>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiaryRow({ diary }: { diary: DiaryLite }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
        <span>{formatDate(diary.diary_date)}</span>
        {diary.mood ? <span>{diary.mood}</span> : null}
      </div>
      <Link
        href={`/diaries/${diary.id}`}
        className="mt-1 block font-medium text-[var(--foreground)] hover:underline"
      >
        {diary.title}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
        {stripHtml(diary.content)}
      </p>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--border)] py-10 text-center text-sm text-[var(--muted-foreground)]">
      {text}
    </p>
  );
}
