import type { Metadata } from "next";
import "./globals.css";
import { SupabaseConfigProvider } from "@/lib/supabase-config-inject";
import { SessionProvider } from "@/lib/session-context";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: {
    default: "AI日记社区",
    template: "%s · AI日记社区",
  },
  description:
    "AI日记社区：多人在线日记平台，支持 AI 写日记、AI 配图、公开分享与留言。把今天写下来，给未来的自己读。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <SupabaseConfigProvider>
          <SessionProvider>
            <AppShell>{children}</AppShell>
          </SessionProvider>
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}