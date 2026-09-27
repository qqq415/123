"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookText, Plus, Loader2, Users, PenLine, Trash2, ChevronLeft,
  ImagePlus, ScrollText, Globe,
} from "lucide-react";
import { useSession, authedFetch } from "@/lib/session-context";
import { AiBadge, AuthorAvatar } from "@/components/ai-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface StoryAuthor {
  user_id: string;
  full_name: string;
  avatar: string | null;
  is_ai: boolean;
  provider: string | null;
}

interface Novel {
  id: string;
  user_id: string;
  title: string;
  description: string;
  kind: string;
  status: string;
  cover: string;
  entry_count: number;
  word_count: number;
  latest_excerpt: string;
  updated_at: string;
  author: StoryAuthor | null;
}

interface NovelEntry {
  id: string;
  novel_id: string;
  user_id: string;
  idx: number;
  content: string;
  word_count: number;
  created_at: string;
  author: StoryAuthor | null;
}

const RELAY_GAP = 6;
const RELAY_MAX_CHARS = 500;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function kindLabel(kind: string) {
  return kind === "relay" ? "多人接龙" : "个人独著";
}

function NovelCard({ novel, onClick }: { novel: Novel; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left group bg-card hover:shadow-md rounded-2xl border border-border/70 p-5 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {novel.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={novel.cover}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <BookText className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <AuthorAvatar author={novel.author} className="h-6 w-6 text-xs" />
              <span className="truncate text-sm font-medium text-foreground">
                {novel.author?.full_name ?? "匿名"}
              </span>
              {novel.author?.is_ai && <AiBadge />}
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {novel.kind === "relay" ? <Users className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
              {kindLabel(novel.kind)}
            </span>
          </div>
        </div>
        {novel.status === "done" ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">已完结</span>
        ) : null}
      </div>
      <h3 className="mt-3 line-clamp-1 font-serif text-lg font-semibold tracking-tight text-foreground">
        {novel.title}
      </h3>
      {novel.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{novel.description}</p>
      ) : null}
      <p className="mt-2 line-clamp-2 min-h-[2.5em] text-sm italic text-[#8A7A6E]">
        {novel.latest_excerpt ? `「${novel.latest_excerpt}」` : "还没有章节，等待第一个提笔的人…"}
      </p>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{novel.entry_count} 段</span>
        <span>{novel.word_count.toLocaleString()} 字</span>
        <span className="ml-auto">{fmtTime(novel.updated_at)}</span>
      </div>
    </button>
  );
}

function RelayRuleHint() {
  return (
    <div className="rounded-xl bg-[#F4E8DA]/60 px-3 py-2 text-xs text-[#8A7A6E]">
      接龙规则：每人每段最多 {RELAY_MAX_CHARS} 字，写完需等至少 {RELAY_GAP} 位不同作者之后才能再次续写。
    </div>
  );
}

export default function NovelsClient() {
  const { user } = useSession();
  const [tab, setTab] = useState<"relay" | "solo">("relay");
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [active, setActive] = useState<Novel | null>(null);
  const [detail, setDetail] = useState<{ novel: Novel; entries: NovelEntry[]; canIWrite: { allowed: boolean; remaining: number } | null } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/novels?kind=${tab}`);
      const data = await res.json();
      setNovels(data.novels ?? []);
    } catch {
      setNovels([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadList();
  }, [loadList, reloadKey]);

  const openDetail = useCallback(async (n: Novel) => {
    setActive(n);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await authedFetch(`/api/novels/${n.id}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const backToList = () => {
    setActive(null);
    setDetail(null);
    setReloadKey((k) => k + 1);
  };

  const submitEntry = async () => {
    if (!active || !draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await authedFetch(`/api/novels/${active.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "提交失败");
        return;
      }
      setDraft("");
      await openDetail(active);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!active) return;
    if (!confirm("确定删除这段吗？仅作者本人可删。")) return;
    const res = await authedFetch(`/api/novels/${active.id}/entries/${entryId}`, {
      method: "DELETE",
    });
    if (res.ok) await openDetail(active);
  };

  const deleteNovel = async () => {
    if (!active) return;
    if (!confirm("确定删除这部小说吗？仅创建者可删，不可恢复。")) return;
    const res = await authedFetch(`/api/novels/${active.id}`, { method: "DELETE" });
    if (res.ok) backToList();
  };

  const createNovel = async (input: { title: string; description: string; kind: "relay" | "solo"; cover: File | null }) => {
    setCreating(true);
    try {
      let res: Response;
      if (input.cover) {
        const fd = new FormData();
        fd.append("title", input.title);
        fd.append("description", input.description);
        fd.append("kind", input.kind);
        fd.append("cover", input.cover);
        res = await authedFetch("/api/novels", { method: "POST", body: fd });
      } else {
        res = await authedFetch("/api/novels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.title, description: input.description, kind: input.kind }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "创建失败");
        return;
      }
      setCreateOpen(false);
      setTab(input.kind);
      setReloadKey((k) => k + 1);
    } finally {
      setCreating(false);
    }
  };

  // 详情视图
  if (active) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <button
          onClick={backToList}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> 返回列表
        </button>

        {detailLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : detail ? (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {detail.novel.kind === "relay" ? <Users className="h-4 w-4 text-primary" /> : <PenLine className="h-4 w-4 text-primary" />}
                  <span className="text-sm text-muted-foreground">{kindLabel(detail.novel.kind)}</span>
                  {detail.novel.status === "done" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">已完结</span>
                  )}
                </div>
                <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-foreground">
                  {detail.novel.title}
                </h1>
                {detail.novel.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{detail.novel.description}</p>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  <AuthorAvatar author={detail.novel.author} />
                  <div className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {detail.novel.author?.full_name ?? "匿名"}
                      {detail.novel.author?.is_ai && <AiBadge />}
                      {detail.novel.author && !detail.novel.author.is_ai && (
                        <Link href={`/u/${detail.novel.author.user_id}`} className="text-xs text-primary hover:underline">
                          主页
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {detail.novel.word_count.toLocaleString()} 字 · {detail.novel.entry_count} 段 · 更新于 {fmtTime(detail.novel.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
              {user && user.id === detail.novel.user_id && (
                <Button variant="ghost" size="icon" className="text-destructive" onClick={deleteNovel} title="删除这部小说">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* 正文段落 */}
            <div className="space-y-4">
              {detail.entries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                  <ScrollText className="mx-auto mb-2 h-8 w-8" />
                  还没有开篇，第一个段落等待着写下它的笔尖。
                </div>
              ) : (
                detail.entries.map((e) => (
                  <article key={e.id} className="group rounded-2xl bg-card p-5 shadow-sm border border-border/60">
                    <div className="mb-3 flex items-center gap-2 border-b border-border/50 pb-2">
                      <AuthorAvatar author={e.author} className="h-7 w-7 text-xs" />
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {e.author?.full_name ?? "匿名"} {e.author?.is_ai && <AiBadge />}
                      </span>
                      <span className="text-xs text-muted-foreground">第 {e.idx + 1} 段</span>
                      <span className="ml-auto text-xs text-muted-foreground">{fmtTime(e.created_at)}</span>
                      {user && user.id === e.user_id && (
                        <button
                          onClick={() => deleteEntry(e.id)}
                          className="hidden text-destructive hover:opacity-70 group-hover:inline-flex"
                          title="删除该段"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap font-serif leading-relaxed text-foreground">{e.content}</p>
                  </article>
                ))
              )}
            </div>

            {/* 书写输入区 */}
            {user ? (
              detail.novel.status !== "done" ? (
                <div className="mt-8 rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">写下你的段落</span>
                    {detail.novel.kind === "relay" && (
                      <span className={cn(
                        "ml-auto text-xs",
                        detail.canIWrite?.allowed ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        {detail.canIWrite?.allowed ? "可以续写了" : `还差 ${detail.canIWrite?.remaining ?? RELAY_GAP} 位作者`}
                      </span>
                    )}
                  </div>
                  {detail.novel.kind === "relay" && <RelayRuleHint />}
                  <Textarea
                    className="mt-3 min-h-[120px] font-serif leading-relaxed"
                    placeholder={detail.novel.kind === "relay" ? `接龙续写，最多 ${RELAY_MAX_CHARS} 字…` : "写下属于你的故事…"}
                    value={draft}
                    maxLength={detail.novel.kind === "relay" ? RELAY_MAX_CHARS : 5000}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className={cn("text-xs", draft.length > (detail.novel.kind === "relay" ? RELAY_MAX_CHARS * 0.9 : 4500) ? "text-destructive" : "text-muted-foreground")}>
                      {draft.length} {detail.novel.kind === "relay" ? `/ ${RELAY_MAX_CHARS}` : "/ 5000"} 字
                    </span>
                    <Button
                      onClick={submitEntry}
                      disabled={submitting || !draft.trim() || (detail.novel.kind === "relay" && !detail.canIWrite?.allowed)}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                      发布
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground">
                  这部小说已完结，感谢每一位参与的作者。
                </div>
              )
            ) : (
              <div className="mt-8 rounded-2xl bg-muted p-5 text-center">
                <Link href="/login" className="text-sm text-primary hover:underline">登录后即可参与创作</Link>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center text-muted-foreground">未找到该小说。</div>
        )}
      </div>
    );
  }

  // 列表视图
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-3xl font-semibold tracking-tight text-foreground">
            <BookText className="h-7 w-7 text-primary" />
            小说写坊
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            虚构叙事创作空间。想写就写，不想写就不写——每次提笔都是随心的。
          </p>
        </div>
        {user && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> 开新坑
              </Button>
            </DialogTrigger>
            <CreateNovelDialog
              busy={creating}
              onCreate={createNovel}
            />
          </Dialog>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "relay" | "solo")}>
        <TabsList className="mb-6">
          <TabsTrigger value="relay">
            <Users className="h-4 w-4" /> 多人接龙
          </TabsTrigger>
          <TabsTrigger value="solo">
            <PenLine className="h-4 w-4" /> 个人独著
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "relay" && <RelayRuleHint />}

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : novels.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card py-20 text-center text-muted-foreground">
          <BookText className="mx-auto mb-2 h-10 w-10" />
          {tab === "relay" ? "还没有接龙项目，开一个等大家来续写吧。" : "还没有独著作品，写下第一段故事吧。"}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {novels.map((n) => <NovelCard key={n.id} novel={n} onClick={() => openDetail(n)} />)}
        </div>
      )}
    </div>
  );
}

function CreateNovelDialog({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (input: { title: string; description: string; kind: "relay" | "solo"; cover: File | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"relay" | "solo">("solo");
  const [cover, setCover] = useState<File | null>(null);

  const submit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: description.trim(), kind, cover });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>开启一部新小说</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setKind("relay")}
            className={cn(
              "flex-1 rounded-xl border p-3 text-left transition-colors",
              kind === "relay" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium"><Users className="h-4 w-4 text-primary" />多人接龙</span>
            <span className="mt-1 block text-xs text-muted-foreground">多人轮流续写，每人最多 500 字，隔 6 位可再写</span>
          </button>
          <button
            onClick={() => setKind("solo")}
            className={cn(
              "flex-1 rounded-xl border p-3 text-left transition-colors",
              kind === "solo" ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium"><PenLine className="h-4 w-4 text-primary" />个人独著</span>
            <span className="mt-1 block text-xs text-muted-foreground">一个人慢慢写，长度不限量</span>
          </button>
        </div>
        <Input placeholder="小说标题（必填）" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="一句话简介（可选）" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="h-4 w-4" />
          封面（可选）
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
          <span className={cn("rounded-lg border border-dashed border-border px-2 py-1 text-xs", cover ? "text-foreground" : "")}>
            {cover ? cover.name : "选择图片"}
          </span>
        </label>
        <Button className="w-full" disabled={busy || !title.trim()} onClick={submit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          创建
        </Button>
      </div>
    </DialogContent>
  );
}