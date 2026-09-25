"use client";

import { useState } from "react";
import { ImageIcon, Loader2, WandSparkles, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authedFetch } from "@/lib/session-context";
import { DiaryPhoto } from "@/lib/types";

interface AIImageProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (photo: DiaryPhoto) => void;
}

export function AIImage({ open, onOpenChange, onInsert }: AIImageProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<DiaryPhoto | null>(null);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const res = await authedFetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), size: "2K" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "生成失败");
        return;
      }
      if (data.images?.[0]) setPreview(data.images[0]);
      else setError("生成结果为空，请重试");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!preview) return;
    onInsert(preview);
    setPrompt("");
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" /> AI 配图
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">图片描述</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：雨后的老巷子里，一个孩子撑着油纸伞看向远处的桂花树"
              rows={2}
            />
          </div>

          <Button onClick={generate} disabled={loading || !prompt.trim()} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在绘图…
              </>
            ) : (
              <>
                <WandSparkles className="mr-2 h-4 w-4" /> 生成图片
              </>
            )}
          </Button>

          {error && <p className="text-sm text-destructive">❌ {error}</p>}

          {preview && (
            <div className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt="AI 生成" className="max-h-80 w-full object-contain" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleInsert} disabled={!preview}>
            <Plus className="mr-2 h-4 w-4" /> 插入到日记
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}