"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, ImageIcon, Save, Globe, Lock, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichEditor } from "@/components/rich-editor";
import { PhotoUpload } from "@/components/photo-upload";
import { AIWriter } from "@/components/ai-writer";
import { AIImage } from "@/components/ai-image";
import { useSession, authedFetch } from "@/lib/session-context";
import { Diary, DiaryPhoto } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOODS = ["开心", "平静", "难过", "焦虑", "兴奋", "感激", "疲惫", "生气"];

interface DiaryEditorProps {
  mode: "create" | "edit";
  diaryId?: string;
  initial?: Partial<Diary> | null;
}

export function DiaryEditor({ mode, diaryId, initial }: DiaryEditorProps) {
  const router = useRouter();
  const { user, loading } = useSession();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [diaryDate, setDiaryDate] = useState(initial?.diary_date ?? new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [isPublic, setIsPublic] = useState(initial?.is_public ?? true);
  const [contentHtml, setContentHtml] = useState(initial?.content ?? "");
  const [photos, setPhotos] = useState<DiaryPhoto[]>(initial?.photos ?? []);
  const editorRef = useRef<HTMLDivElement>(null);

  const [writerOpen, setWriterOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user && mode === "create") router.replace("/login");
  }, [loading, user, mode, router]);

  const insertToEditor = (text: string) => {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
      .join("");
    const editor = (editorRef.current?.querySelector('[contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"]')) as HTMLDivElement | null;
    if (editor) {
      editor.focus();
      document.execCommand("insertHTML", false, paragraphs + "<p><br></p>");
      setContentHtml(editor.innerHTML);
    } else {
      setContentHtml((h) => h + paragraphs);
    }
  };

  const insertPhoto = (photo: DiaryPhoto) => {
    setPhotos((p) => [...p, photo]);
  };

  const save = async () => {
    if (!title.trim()) {
      setError("请填写日记标题");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        content: contentHtml,
        mood: mood || null,
        diary_date: diaryDate,
        is_public: isPublic,
        photo_keys: photos.map((p) => p.key),
      };
      const res =
        mode === "edit"
          ? await authedFetch(`/api/diaries/${diaryId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          : await authedFetch("/api/diaries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "保存失败");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(`/diaries/${data.diary.id}`);
        router.refresh();
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading || (mode === "create" && !user)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
        {mode === "edit" ? "编辑日记" : "写一篇日记"}
      </h1>

      <div className="diary-paper space-y-6 rounded-2xl border border-border/70 p-5 sm:p-8">
        {/* 标题 + 日期 */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给今天写一个标题…"
              className="h-11 text-base font-medium"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                value={diaryDate}
                onChange={(e) => setDiaryDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>心情</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue placeholder="记录此刻心情" />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 隐私设置 */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={cn("grid h-9 w-9 place-items-center rounded-lg", isPublic ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
              {isPublic ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{isPublic ? "公开" : "仅自己可见"}</p>
              <p className="text-xs text-muted-foreground">
                {isPublic ? "其他登录用户可浏览并留言" : "只有你自己能看到这篇日记"}
              </p>
            </div>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {/* 正文 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>正文</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setWriterOpen(true)}>
                <Sparkles className="mr-1 h-4 w-4 text-primary" /> AI 写日记
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setImageOpen(true)}>
                <ImageIcon className="mr-1 h-4 w-4 text-primary" /> AI 配图
              </Button>
            </div>
          </div>
          <div ref={editorRef}>
            <RichEditor initialValue={initial?.content ?? ""} onChange={setContentHtml} placeholder="记录今天的故事…" className="min-h-[320px]" />
          </div>
        </div>

        {/* 照片上传 */}
        <div className="space-y-1.5">
          <Label>配图（{photos.length}/9）</Label>
          <PhotoUpload value={photos} onChange={setPhotos} disabled={saving} />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        {success && (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" /> 已保存，正在跳转…
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <X className="mr-1.5 h-4 w-4" /> 取消
          </Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 保存中…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> {mode === "edit" ? "保存修改" : "发布日记"}
              </>
            )}
          </Button>
        </div>
      </div>

      <AIWriter open={writerOpen} onOpenChange={setWriterOpen} onUse={insertToEditor} />
      <AIImage open={imageOpen} onOpenChange={setImageOpen} onInsert={insertPhoto} />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}