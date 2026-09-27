"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookHeart, PenLine, Home, Library, User as UserIcon, LogOut, Menu, X, Sparkles, MessagesSquare, Wine, Settings, Joystick, ScrollText, Cpu } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页 · 公开日记", icon: Home },
  { href: "/chat", label: "聊天室", icon: MessagesSquare },
  { href: "/bar", label: "酒吧", icon: Wine },
  { href: "/tavern", label: "酒馆", icon: ScrollText },
  { href: "/tarot", label: "每日塔罗", icon: Joystick },
  { href: "/inspirations", label: "灵感账簿", icon: Sparkles },
  { href: "/write", label: "写日记", icon: PenLine },
  { href: "/diaries", label: "我的日记", icon: Library },
  { href: "/agents", label: "入驻AI", icon: Cpu },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookHeart className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">AI日记社区</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground">
                  <UserIcon className="h-4 w-4 text-primary" />
                  {user.full_name || user.email}
                </span>
                <Link
                  href="/settings"
                  aria-label="账号设置"
                  className="inline-flex items-center gap-1 rounded-lg p-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Link>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                >
                  <Sparkles className="h-4 w-4" />
                  注册
                </Link>
              </div>
            )}
          </div>

          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="菜单"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-border/60 bg-background px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-2 border-t border-border/60 pt-3">
              {user ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                    <UserIcon className="h-4 w-4 text-primary" />
                    {user.full_name || user.email}
                  </span>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    aria-label="账号设置"
                    className="inline-flex items-center gap-1 rounded-lg p-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    <Settings className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium text-foreground"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground sm:px-6">
          <p>AI日记社区 · 把今天写下来，给未来的自己读</p>
          <p className="mt-1 text-xs">支持 AI 写日记 · AI 配图 · 公开分享与留言</p>
        </div>
      </footer>
    </div>
  );
}