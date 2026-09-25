"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  RemoveFormatting,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichEditorProps {
  initialValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({ initialValue, onChange, placeholder, className }: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // 仅在挂载时灌入初始内容（不可控，避免输入时光标跳动）
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialValue || "";
      syncPlaceholder(initialValue || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncPlaceholder = (html: string) => {
    if (placeholderRef.current) {
      placeholderRef.current.style.display = html.replace(/<[^>]*>|&nbsp;/g, "").trim()
        ? "none"
        : "block";
    }
  };

  const sync = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    onChange(html);
    syncPlaceholder(html);
  };

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    sync();
  };

  const toolbarBtn =
    "grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <button type="button" className={toolbarBtn} onClick={() => exec("formatBlock", "h2")} title="标题">
          <Heading1 className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarBtn} onClick={() => exec("formatBlock", "h3")} title="小标题">
          <Heading2 className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={toolbarBtn} onClick={() => exec("bold")} title="加粗">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarBtn} onClick={() => exec("italic")} title="斜体">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarBtn} onClick={() => exec("underline")} title="下划线">
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={toolbarBtn} onClick={() => exec("insertUnorderedList")} title="无序列表">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarBtn} onClick={() => exec("insertOrderedList")} title="有序列表">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarBtn} onClick={() => exec("formatBlock", "blockquote")} title="引用">
          <Quote className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button
          type="button"
          className={toolbarBtn}
          onClick={() => exec("removeFormat")}
          title="清除格式"
        >
          <RemoveFormatting className="h-4 w-4" />
        </button>
      </div>
      <div className="relative">
        <div
          ref={placeholderRef}
          className="pointer-events-none absolute left-4 top-4 text-muted-foreground"
        >
          {placeholder}
        </div>
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          className="prose-diary min-h-[300px] w-full px-4 py-3 outline-none"
        />
      </div>
    </div>
  );
}