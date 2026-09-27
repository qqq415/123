"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AvatarView } from "@/components/avatar-view";
import { AiBadge } from "@/components/ai-badge";
import { useSession } from "@/lib/session-context";
import { authedFetch } from "@/lib/session-context";

interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string;
  actor_is_ai: boolean;
  actor_name: string;
  actor_avatar: string | null;
  type: "diary_comment" | "tarot_comment";
  target_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

const TYPE_LABEL: Record<AppNotification["type"], string> = {
  diary_comment: "评论了你的日记",
  tarot_comment: "给你的塔罗日运留了言",
};

export function NotificationBell() {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!session.user) return;
    try {
      const res = await authedFetch("/api/notifications?unread=1");
      if (res.ok) {
        const data = (await res.json()) as { unread: number };
        setUnread(data.unread ?? 0);
      }
    } catch {
      // 静默
    }
  }, [session.user]);

  const loadAll = useCallback(async () => {
    if (!session.user) return;
    try {
      const res = await authedFetch("/api/notifications");
      if (res.ok) {
        const data = (await res.json()) as {
          notifications: AppNotification[];
          unread: number;
        };
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      }
    } catch {
      // 静默
    }
  }, [session.user]);

  useEffect(() => {
    if (!session.user) {
      setUnread(0);
      setItems([]);
      return;
    }
    refreshUnread();
    timerRef.current = setInterval(refreshUnread, 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.user, refreshUnread]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      loadAll();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await authedFetch("/api/notifications/read", { method: "POST" });
      if (res.ok) {
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch {
      // 静默
    }
  };

  const handleClickItem = (n: AppNotification) => {
    setOpen(false);
    if (n.type === "diary_comment" && n.target_id) {
      router.push(`/diary/${n.target_id}`);
    } else if (n.type === "tarot_comment") {
      router.push(`/u/${session.user?.id}`);
    }
  };

  if (!session.user) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="消息通知"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 min-w-5 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <span className="font-serif text-base font-semibold">消息通知</span>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)]"
            >
              全部标为已读
            </button>
          )}
        </div>
        <ScrollArea className="h-[380px]">
          {items.length === 0 ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Bell className="size-8 opacity-40" />
              还没有新消息
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClickItem(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--accent)] ${
                      !n.is_read ? "bg-[var(--secondary)]/50" : ""
                    }`}
                  >
                    <AvatarView
                      avatar={n.actor_avatar}
                      fallback={n.actor_name}
                      size={36}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-medium">{n.actor_name}</span>
                        {n.actor_is_ai && <AiBadge />}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {TYPE_LABEL[n.type]}
                      </p>
                      {n.content && (
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed">
                          {n.content}
                        </p>
                      )}
                      <span className="mt-1 block text-[11px] text-[var(--muted-foreground)]">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--primary)]" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}