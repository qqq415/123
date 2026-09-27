"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarView } from "@/components/avatar-view";
import { authedFetch, useSession } from "@/lib/session-context";

const PRESET_EMOJIS = [
  "🌙", "📖", "🌿", "☕", "🕯️", "🦊", "🐻", "🐱",
  "🦉", "🐧", "🌊", "🔥", "⭐", "🍀", "🌸", "🪶",
  "🎭", "🧭", "🍂", "🫧", "🐳", "🦋", "🌙", "✒️",
];

export default function SettingsClient() {
  const { user, loading, refresh } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  if (!loading && !user) {
    router.replace("/login");
  }

  const setAvatar = async (avatar: string) => {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const res = await authedFetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "更新失败");
        return;
      }
      setOk("头像已更新");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authedFetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "上传失败");
        return;
      }
      setOk("头像已更新");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-1 font-serif text-2xl font-bold text-[var(--foreground)]">
        账号设置
      </h1>
      <p className="mb-6 text-sm text-[var(--muted-foreground)]">
        换一个喜欢的头像，可以选 emoji，也可以上传自己的图片。
      </p>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <AvatarView avatar={user?.avatar} fallback={user?.full_name?.slice(0, 1)} size={72} />
          <div>
            <p className="font-medium text-[var(--foreground)]">{user?.full_name}</p>
            <p className="text-xs text-[var(--muted-foreground)]">当前头像</p>
          </div>
        </div>

        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">选一个 emoji</p>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_EMOJIS.map((e, i) => (
            <button
              key={`${e}-${i}`}
              disabled={busy}
              onClick={() => setAvatar(e)}
              className="flex aspect-square items-center justify-center rounded-lg border border-[var(--border)] text-xl transition hover:border-[var(--ring)] hover:bg-[var(--muted)] disabled:opacity-50"
            >
              {e}
            </button>
          ))}
        </div>

        <div className="my-5 h-px bg-[var(--border)]" />

        <p className="mb-2 text-sm font-medium text-[var(--foreground)]">上传图片</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <button
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm text-[var(--foreground)] transition hover:bg-[var(--muted)] disabled:opacity-50"
        >
          从本地上传（5MB 以内）
        </button>

        {error && <p className="mt-4 text-sm text-[var(--destructive)]">{error}</p>}
        {ok && (
          <p className="mt-4 text-sm text-[var(--primary)]">{ok}</p>
        )}
      </div>

      <AiAvatarManager />
    </div>
  );
}

interface AgentLite {
  slug: string;
  name: string;
  avatar: string;
}

const AI_EMOJIS = ["🫘", "🌊", "💡", "🐚", "🌱", "🧠", "🫛", "📚", "🌪️", "🪄"];

function AiAvatarManager() {
  const [agents, setAgents] = useState<AgentLite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busySlug, setBusySlug] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch("/api/ai/agents");
    const data = await res.json();
    setAgents(
      (data.agents || []).map((a: AgentLite) => ({
        slug: a.slug,
        name: a.name,
        avatar: a.avatar,
      })),
    );
    setLoaded(true);
  };

  if (!loaded) {
    return (
      <button
        onClick={() => void load()}
        className="mt-6 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left text-sm text-[var(--muted-foreground)] shadow-sm hover:bg-[var(--muted)]"
      >
        展开 AI 成员头像设置
      </button>
    );
  }

  const change = async (slug: string, avatar: string) => {
    setBusySlug(slug);
    setMsg("");
    try {
      const res = await authedFetch("/api/ai/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, avatar }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "更新失败");
        return;
      }
      setAgents((list) =>
        list.map((a) => (a.slug === slug ? { ...a, avatar } : a)),
      );
      setMsg("AI 头像已更新");
    } finally {
      setBusySlug("");
    }
  };

  const uploadFor = async (slug: string, file: File) => {
    setBusySlug(slug);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("slug", slug);
      fd.append("file", file);
      const res = await authedFetch("/api/ai/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "上传失败");
        return;
      }
      setAgents((list) =>
        list.map((a) => (a.slug === slug ? { ...a, avatar: data.avatar } : a)),
      );
      setMsg("AI 头像已更新");
    } finally {
      setBusySlug("");
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-1 font-serif text-lg font-bold text-[var(--foreground)]">
        AI 成员头像
      </h2>
      <p className="mb-4 text-xs text-[var(--muted-foreground)]">
        为社区里的 AI 换个头像，全站同步。注：AI 重启后仍保留该设置。
      </p>
      <ul className="space-y-4">
        {agents.map((a) => (
          <li key={a.slug} className="flex items-center gap-3">
            <AvatarView avatar={a.avatar} fallback="🤖" size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {a.name}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {AI_EMOJIS.map((e) => (
                  <button
                    key={e}
                    disabled={busySlug === a.slug}
                    onClick={() => void change(a.slug, e)}
                    className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border)] text-sm hover:border-[var(--ring)] disabled:opacity-50"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <label className="shrink-0 cursor-pointer rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)]">
              上传
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busySlug === a.slug}
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f) void uploadFor(a.slug, f);
                  ev.target.value = "";
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      {msg && <p className="mt-4 text-sm text-[var(--primary)]">{msg}</p>}
    </div>
  );
}
