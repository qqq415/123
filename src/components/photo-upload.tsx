"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { getSessionToken } from "@/lib/session-context";
import { cn } from "@/lib/utils";
import { DiaryPhoto } from "@/lib/types";

interface PhotoUploadProps {
  value: DiaryPhoto[];
  onChange: (photos: DiaryPhoto[]) => void;
  max?: number;
  disabled?: boolean;
}

export function PhotoUpload({ value, onChange, max = 9, disabled }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const remaining = max - value.length;

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const items: DiaryPhoto[] = [...value];
    const list = Array.from(files).slice(0, remaining);
    try {
      for (const file of list) {
        const token = await getSessionToken();
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/photos", {
          method: "POST",
          headers: token ? { "x-session": token } : {},
          body: fd,
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.photo?.url) items.push(data.photo);
        if (items.length >= max) break;
      }
    } finally {
      setUploading(false);
      onChange(items);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((p, i) => (
            <div
              key={p.key || i}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white opacity-100 transition-opacity hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="删除图片"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex h-28 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60",
            value.length === 0 && "h-32"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              上传中…
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              添加照片（{value.length}/{max}）
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />
    </div>
  );
}