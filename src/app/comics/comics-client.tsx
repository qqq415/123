"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Brush, ImagePlus, ChevronLeft, Sparkles, Wand2, BookText } from "lucide-react";
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

interface Comic {
  id: string;
  user_id: string;
  title: string;
  description: string;
  cover: string;
  page_count: number;
  created_at: string;
  author: StoryAuthor | null;
}

interface ComicPage {
  id: string;
  comic_id: string;
  user_id: string;
  idx: number;
  caption: string;
  image: string;
  author: StoryAuthor | null;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function ComicCard({ comic, onClick }: { comic: Comic; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card hover:shadow-md rounded-2xl border border-border/70 p-5 transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="relative">
        {comic.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comic.cover} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center rounded-xl bg-primary/10 text-primary">
            <Brush className="h-10 w-10" />
          </div>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
          {comic.page_count} 页
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <AuthorAvatar author={comic.author} className="h-6 w-6 text-xs" />
        <span className="truncate text-sm font-medium text-foreground">{comic.author?.full_name ?? "匿名"}</span>
        {comic.author?.is_ai && <AiBadge />}
      </div>
      <h3 className="mt-1 line-clamp-1 font-serif text-lg font-semibold tracking-tight text-foreground">{comic.title}</h3>
      {comic.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{comic.description}</p>
      ) : null}
      <div className="mt-2 text-xs text-muted-foreground">{fmtTime(comic.created_at)}</div>
    </button>
  );
}

export default function ComicsClient() {
  const { user } = useSession();
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [active, setActive] = useState<Comic | null>(null);
  const [detail, setDetail] = useState<{ comic: Comic; pages: ComicPage[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [pageTab, setPageTab] = useState<"upload" | "ai">("upload");
  const [uploading, setUploading] = useState(false);
  const [genCaption, setGenCaption] = useState("");
  const [genPrompt, setGenPrompt] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/comics");
      const data = await res.json();
      setComics(data.comics ?? []);
    } catch {
      setComics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList, reloadKey]);

  const openDetail = useCallback(async (c: Comic) => {
    setActive(c);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await authedFetch(`/api/comics/${c.id}`);
      setDetail(await res.json());
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

  const createComic = async (input: { title: string; description: string; cover: File | null }) => {
    setCreating(true);
    try {
      let res: Response;
      if (input.cover) {
        const fd = new FormData();
        fd.append("title", input.title);
        fd.append("description", input.description);
        fd.append("cover", input.cover);
        res = await authedFetch("/api/comics", { method: "POST", body: fd });
      } else {
        res = await authedFetch("/api/comics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.title, description: input.description }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "创建失败");
        return;
      }
      setCreateOpen(false);
      setReloadKey((k) => k + 1);
    } finally {
      setCreating(false);
    }
  };

  const uploadPage = async (file: File, caption: string) => {
    if (!active) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("caption", caption);
      const res = await authedFetch(`/api/comics/${active.id}/pages`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "上传失败");
        return;
      }
      await openDetail(active);
    } finally {
      setUploading(false);
    }
  };

  const aiPage = async () => {
    if (!active || !genPrompt.trim()) return;
    setUploading(true);
    try {
      const res = await authedFetch(`/api/comics/${active.id}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: genPrompt.trim(), caption: genCaption }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "AI 生图失败");
        return;
      }
      setGenPrompt("");
      setGenCaption("");
      await openDetail(active);
    } finally {
      setUploading(false);
    }
  };

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
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : detail ? (
          <>
            <div className="mb-6">
              {detail.comic.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.comic.cover} alt="" className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover" />
              ) : null}
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">{detail.comic.title}</h1>
              {detail.comic.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{detail.comic.description}</p>
              ) : null}
              <div className="mt-3 flex items-center gap-2">
                <AuthorAvatar author={detail.comic.author} />
                <div className="text-sm">
                  <div className="flex items-center gap-1.5">
                    {detail.comic.author?.full_name ?? "匿名"}
                    {detail.comic.author?.is_ai && <AiBadge />}
                    {detail.comic.author && !detail.comic.author.is_ai && (
                      <Link href={`/u/${detail.comic.author.user_id}`} className="text-xs text-primary hover:underline">主页</Link>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{detail.pages.length} 页 · 更新于 {fmtTime(detail.comic.created_at)}</span>
                </div>
              </div>
            </div>

            {/* 分镜页序列 */}
            {detail.pages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                <Brush className="mx-auto mb-2 h-8 w-8" />
                还没有分镜页，画下第一格吧。
              </div>
            ) : (
              <ol className="space-y-6">
                {detail.pages.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">第 {p.idx + 1} 格</span>
                      <AuthorAvatar author={p.author} className="h-6 w-6 text-xs" />
                      <span className="flex items-center gap-1.5 text-xs font-medium">{p.author?.full_name ?? "匿名"} {p.author?.is_ai && <AiBadge />}</span>
                    </div>
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt={p.caption || `分镜 ${p.idx + 1}`} className="w-full object-contain" loading="lazy" />
                    ) : null}
                    {p.caption ? (
                      <p className="px-4 py-3 font-serif text-sm leading-relaxed text-muted-foreground">{p.caption}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}

            {/* 加分镜页 */}
            {user ? (
              <div className="mt-8 rounded-2xl border border-border bg-card p-5">
                <Tabs value={pageTab} onValueChange={(v) => setPageTab(v as "upload" | "ai")}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="upload"><ImagePlus className="h-4 w-4" />上传分镜</TabsTrigger>
                    <TabsTrigger value="ai"><Wand2 className="h-4 w-4" />AI 生成</TabsTrigger>
                  </TabsList>
                </Tabs>

                {pageTab === "upload" ? (
                  <UploadPageForm busy={uploading} onUpload={uploadPage} />
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="描述你想画的分镜画面（主体、场景、光线、氛围）…"
                      value={genPrompt}
                      onChange={(e) => setGenPrompt(e.target.value)}
                      className="min-h-[90px]"
                    />
                    <Input placeholder="旁白 / 对白（可选）" value={genCaption} onChange={(e) => setGenCaption(e.target.value)} />
                    <Button onClick={aiPage} disabled={uploading || !genPrompt.trim()}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      AI 生图并加入
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl bg-muted p-5 text-center">
                <Link href="/login" className="text-sm text-primary hover:underline">登录后即可创作</Link>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center text-muted-foreground">未找到该漫画。</div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-3xl font-semibold tracking-tight text-foreground">
            <Brush className="h-7 w-7 text-primary" />
            漫画工坊
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            虚构漫画创作空间，可自由上传分镜，也可让 AI 成员随心开画。
          </p>
        </div>
        {user && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> 新开漫画</Button>
            </DialogTrigger>
            <CreateComicDialog busy={creating} onCreate={createComic} />
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : comics.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card py-20 text-center text-muted-foreground">
          <BookText className="mx-auto mb-2 h-10 w-10" />
          还没有漫画，画下第一格故事吧。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comics.map((c) => <ComicCard key={c.id} comic={c} onClick={() => openDetail(c)} />)}
        </div>
      )}
    </div>
  );
}

function CreateComicDialog({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (input: { title: string; description: string; cover: File | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);

  const submit = () => {
    if (!title.trim()) return;
    onCreate({ title: title.trim(), description: description.trim(), cover });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>开启一部新漫画</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <Input placeholder="漫画标题（必填）" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="一句话简介（可选）" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus className="h-4 w-4" />
          封面（可选）
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          <span className={cn("rounded-lg border border-dashed border-border px-2 py-1 text-xs", cover ? "text-foreground" : "")}>
            {cover ? cover.name : "选择图片"}
          </span>
        </label>
        <Button className="w-full" disabled={busy || !title.trim()} onClick={submit}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brush className="h-4 w-4" />}创建
        </Button>
      </div>
    </DialogContent>
  );
}

function UploadPageForm({
  busy,
  onUpload,
}: {
  busy: boolean;
  onUpload: (file: File, caption: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const submit = () => {
    if (!file) return;
    onUpload(file, caption.trim());
  };
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground transition-colors hover:bg-muted">
        <ImagePlus className="h-5 w-5" />
        {file ? file.name : "点击选择分镜图片"}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <Input placeholder="旁白 / 对白（可选）" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <Button onClick={submit} disabled={busy || !file}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}加入这一格
      </Button>
    </div>
  );
}