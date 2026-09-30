"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Download,
  Heart,
  ImagePlus,
  Images,
  Sparkles,
  Trash2,
  Upload,
  User as UserIcon,
} from "lucide-react";
import { AvatarView } from "@/components/avatar-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authedFetch, useSession } from "@/lib/session-context";
import { initialOf } from "@/lib/format";

interface GalleryAuthor {
  user_id: string;
  full_name: string;
  avatar: string | null;
  is_ai: boolean;
  provider: string | null;
}

interface GalleryImage {
  id: string;
  user_id: string;
  storage_key: string;
  title: string;
  prompt: string | null;
  source: string;
  mime: string;
  download_count: number;
  like_count: number;
  created_at: string;
  url: string;
  author: GalleryAuthor | null;
  liked: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

async function downloadImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(blobUrl);
}

export default function GalleryClient() {
  const { user } = useSession();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [active, setActive] = useState<GalleryImage | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // 上传表单
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  // AI 生图表单
  const [genPrompt, setGenPrompt] = useState("");
  const [genTitle, setGenTitle] = useState("");
  const [genTab, setGenTab] = useState<"upload" | "ai">("upload");

  const load = useCallback(
    async (reset: boolean) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams({ source, limit: "24" });
        if (!reset && cursor) params.set("cursor", cursor);
        const res = await authedFetch(`/api/gallery?${params.toString()}`);
        const json = (await res.json()) as {
          images?: GalleryImage[];
          cursor?: string | null;
        };
        if (res.ok) {
          setImages((prev) =>
            reset ? json.images ?? [] : [...prev, ...(json.images ?? [])],
          );
          setCursor(json.cursor ?? null);
        }
      } catch {
        // 忽略
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [source, cursor],
  );

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const flash = (msg: string): void => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const handleUpload = async (): Promise<void> => {
    if (!pickedFile) {
      flash("请先选择图片");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", pickedFile);
      fd.append("title", title || pickedFile.name || "无题");
      const res = await authedFetch("/api/gallery", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        flash(json.error ?? "上传失败");
        return;
      }
      setUploadOpen(false);
      setPickedFile(null);
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      setSource("all");
      void load(true);
      flash("已发布到公共图库");
    } catch {
      flash("网络异常");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async (): Promise<void> => {
    if (!genPrompt.trim()) {
      flash("请填写画面描述");
      return;
    }
    setBusy(true);
    try {
      const res = await authedFetch("/api/gallery/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: genPrompt, title: genTitle }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        flash(json.error ?? "生成失败");
        return;
      }
      setUploadOpen(false);
      setGenPrompt("");
      setGenTitle("");
      setSource("all");
      void load(true);
      flash("AI 作品已发布");
    } catch {
      flash("网络异常");
    } finally {
      setBusy(false);
    }
  };

  const handleLike = async (image: GalleryImage): Promise<void> => {
    if (!user) {
      flash("请先登录");
      return;
    }
    const prevLiked = image.liked;
    const prevCount = image.like_count;
    const apply = (liked: boolean, likes: number): void => {
      setImages((prev) =>
        prev.map((i) =>
          i.id === image.id ? { ...i, liked, like_count: likes } : i,
        ),
      );
      setActive((a) =>
        a && a.id === image.id ? { ...a, liked, like_count: likes } : a,
      );
    };
    // 乐观更新
    apply(!prevLiked, Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    try {
      const res = await authedFetch(`/api/gallery/${image.id}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const json = (await res.json()) as { liked: boolean; likes: number };
        apply(Boolean(json.liked), Number(json.likes) || 0);
      } else {
        apply(prevLiked, prevCount); // 回滚
      }
    } catch {
      apply(prevLiked, prevCount); // 回滚
    }
  };

  const handleDownload = async (image: GalleryImage): Promise<void> => {
    try {
      const res = await authedFetch(
        `/api/gallery/${image.id}/download`,
      );
      const json = (await res.json()) as {
        url?: string;
        title?: string;
        error?: string;
      };
      if (!res.ok || !json.url) {
        flash(json.error ?? "下载失败");
        return;
      }
      const safe = (json.title || image.id).replace(/[^\w一-龥-]+/g, "_");
      await downloadImage(json.url, `${safe}.png`);
      setActive((prev) =>
        prev ? { ...prev, download_count: prev.download_count + 1 } : prev,
      );
    } catch {
      flash("下载失败");
    }
  };

  const handleSetAvatar = async (image: GalleryImage): Promise<void> => {
    if (!user) {
      flash("请先登录");
      return;
    }
    setBusy(true);
    try {
      const res = await authedFetch(`/api/gallery/${image.id}/avatar`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        flash(json.error ?? "设置失败");
        return;
      }
      flash("已设为你的头像，刷新后生效");
    } catch {
      flash("设置失败");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (image: GalleryImage): Promise<void> => {
    setBusy(true);
    try {
      const res = await authedFetch(`/api/gallery/${image.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setImages((prev) => prev.filter((i) => i.id !== image.id));
        setActive(null);
        flash("已删除");
      } else {
        flash("删除失败");
      }
    } catch {
      flash("删除失败");
    } finally {
      setBusy(false);
    }
  };

  const isOwner = (image: GalleryImage): boolean =>
    !!user && user.id === image.user_id;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-primary">
            <Images className="h-4 w-4" />
            <span>公共产品 · 自由取用</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            公共图库
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            这里的每张图都属于社区公共作品，与日记里的私人配图不同。你可以直接下载，
            也可以把喜欢的图设为自己的头像。
          </p>
        </div>
        <Button
          onClick={() => setUploadOpen(true)}
          className="shrink-0"
          disabled={!user}
        >
          <ImagePlus className="h-4 w-4" />
          {user ? "发布图片" : "登录后发布"}
        </Button>
      </header>

      <div className="mb-5 flex items-center justify-between">
        <Tabs value={source} onValueChange={setSource}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="ai">AI 创作</TabsTrigger>
            <TabsTrigger value="upload">成员上传</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-xl bg-muted"
              style={{ height: 180 + ((i * 47) % 160) }}
            />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-20 text-center">
          <Images className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            图库还空空的，来发布第一张公共作品吧
          </p>
        </div>
      ) : (
        <>
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {images.map((image) => (
              <button
                key={image.id}
                onClick={() => setActive(image)}
                className="group block w-full break-inside-avoid overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative w-full">
                  <Image
                    src={image.url}
                    alt={image.title}
                    width={400}
                    height={400}
                    unoptimized
                    className="h-auto w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <AvatarView
                      avatar={image.author?.avatar ?? null}
                      fallback={initialOf(image.author?.full_name ?? "?")}
                      size={22}
                    />
                    <span className="truncate text-sm font-medium text-foreground">
                      {image.title}
                    </span>
                    {image.source === "ai" ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-primary/30 text-[10px] text-primary"
                      >
                        <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                        AI
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleLike(image);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleLike(image);
                        }
                      }}
                      className={`flex cursor-pointer select-none items-center gap-1 text-[11px] transition ${
                        image.liked
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      <Heart
                        className={`h-3 w-3 ${
                          image.liked ? "fill-current text-primary" : ""
                        }`}
                      />
                      {image.like_count}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Download className="h-3 w-3" />
                      {image.download_count}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {cursor ? (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => void load(false)}
                disabled={loadingMore}
              >
                {loadingMore ? "加载中…" : "加载更多"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      {/* 详情 / 下载 / 头像 */}
      <Dialog
        open={!!active}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
      >
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
          {active ? (
            <div className="grid sm:grid-cols-[1.4fr_1fr]">
              <div className="relative bg-muted">
                <Image
                  src={active.url}
                  alt={active.title}
                  width={700}
                  height={700}
                  unoptimized
                  className="h-full max-h-[70vh] w-full object-contain"
                />
              </div>
              <div className="flex flex-col p-5">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">
                    {active.title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 pt-2">
                    <Link
                      href={`/u/${active.author?.user_id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <AvatarView
                        avatar={active.author?.avatar ?? null}
                        fallback={initialOf(active.author?.full_name ?? "?")}
                        size={24}
                      />
                      <span className="text-foreground">
                        {active.author?.full_name ?? "未知作者"}
                      </span>
                    </Link>
                    {active.source === "ai" ? (
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-[10px] text-primary"
                      >
                        <Sparkles className="mr-0.5 h-2.5 w-2.5" />
                        由 AI 创作
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        <Upload className="mr-0.5 h-2.5 w-2.5" />
                        成员上传
                      </Badge>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>{timeAgo(active.created_at)}</span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            active.liked ? "fill-current text-primary" : ""
                          }`}
                        />
                        {active.like_count} 赞
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />
                        {active.download_count} 次下载
                      </span>
                    </span>
                  </div>
                  {active.prompt ? (
                    <div className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="mb-1 block font-medium text-foreground">
                        画面描述
                      </span>
                      {active.prompt}
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-col gap-2 pt-5">
                  <Button
                    variant={active.liked ? "secondary" : "default"}
                    onClick={() => void handleLike(active)}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        active.liked ? "fill-current" : ""
                      }`}
                    />
                    {active.liked ? "已点赞" : "点赞"}
                  </Button>
                  <Button onClick={() => void handleDownload(active)}>
                    <Download className="h-4 w-4" />
                    下载图片
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleSetAvatar(active)}
                    disabled={busy}
                  >
                    <UserIcon className="h-4 w-4" />
                    下载后设为我的头像
                  </Button>
                  {isOwner(active) ? (
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void handleDelete(active)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" />
                      删除此图
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 发布：上传 / AI 生图 */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发布公共图片</DialogTitle>
            <DialogDescription>
              发布后图片属于社区公共作品，任何人都能下载与用作头像。
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={genTab}
            onValueChange={(v) => setGenTab(v as "upload" | "ai")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload className="mr-1 h-3.5 w-3.5" />
                本地上传
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                AI 生图
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {genTab === "upload" ? (
            <div className="space-y-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="作品标题（可留空）"
                maxLength={80}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                {pickedFile ? (
                  <>
                    <ImagePlus className="h-6 w-6" />
                    {pickedFile.name}
                    <span className="text-xs">
                      {(pickedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    点击选择图片（10MB 以内）
                  </>
                )}
              </button>
              <Button
                className="w-full"
                onClick={() => void handleUpload()}
                disabled={busy}
              >
                {busy ? "发布中…" : "发布到图库"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                value={genTitle}
                onChange={(e) => setGenTitle(e.target.value)}
                placeholder="作品标题（可留空）"
                maxLength={80}
              />
              <Textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="描述你想生成的画面：主体、场景、光线、氛围、画风…"
                rows={4}
              />
              <Button
                className="w-full"
                onClick={() => void handleGenerate()}
                disabled={busy}
              >
                {busy ? "生成并发布中…" : "生成并发布"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {notice ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {notice}
        </div>
      ) : null}
    </div>
  );
}
