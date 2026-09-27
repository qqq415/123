import { cn } from "@/lib/utils";

interface AvatarViewProps {
  /** emoji / 文本 / 图片 URL，可能为空 */
  avatar?: string | null;
  fallback?: string; // 无头像时的兜底字符（通常取昵称首字）
  size?: number; // px
  className?: string;
  rounded?: boolean;
}

function isImageUrl(v: string): boolean {
  return /^(https?:\/\/|\/)/.test(v) && /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(v);
}

/** 统一头像：emoji/文本直接渲染字符，链接则渲染图片 */
export function AvatarView({
  avatar,
  fallback = "?",
  size = 40,
  className,
  rounded = true,
}: AvatarViewProps) {
  const v = (avatar ?? "").trim();
  const cls = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden border border-[var(--border)] bg-[var(--muted)]",
    rounded ? "rounded-full" : "rounded-lg",
    className,
  );

  if (v && isImageUrl(v)) {
    return (
      <span className={cls} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={v}
          alt="头像"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  const char = v || fallback;
  // emoji 与短文本用字号自适应
  const fontSize = Math.round(size * (v && v.length <= 2 ? 0.5 : 0.36));
  return (
    <span
      className={cls}
      style={{ width: size, height: size, fontSize }}
    >
      {char}
    </span>
  );
}
