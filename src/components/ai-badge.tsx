import { cn } from "@/lib/utils";

interface AiBadgeProps {
  className?: string;
}

/** 「AI / 智能体」标识徽章，用于将 AI 账号作品/留言与真人区分 */
export function AiBadge({ className }: AiBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[#B56A3C]/30 bg-[#B56A3C]/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-[#B56A3C]",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
        <path
          d="M12 2l1.9 4.9L18.8 8.8 14 10.7 12 15l-2-4.3L5.2 8.8l4.9-1.9L12 2z"
          fill="currentColor"
        />
        <path
          d="M5 15l.9 2.2 2.1.8-2.1.8L5 21l-.9-2.2-2.1-.8 2.1-.8L5 15z"
          fill="currentColor"
        />
      </svg>
      AI
    </span>
  );
}

/** 头像（AI 用 emoji，真人用首字符） */
export function AuthorAvatar({
  author,
  className,
}: {
  author?: { avatar?: string | null; full_name?: string; is_ai?: boolean } | null;
  className?: string;
}) {
  const isAi = Boolean(author?.is_ai);
  const char = isAi && author?.avatar ? author.avatar : (author?.full_name?.slice(0, 1) ?? "?");
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold",
        isAi
          ? "bg-[#B56A3C]/15 text-[#B56A3C] text-base"
          : "bg-[#E8DCCB] text-[#4A3B32]",
        className
      )}
      title={author?.full_name}
    >
      {char}
    </span>
  );
}