"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookHeart, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClientAsync } from "@/lib/supabase-browser";
import { useSession, getSessionToken } from "@/lib/session-context";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const router = useRouter();
  const { refresh } = useSession();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const supabase = await getSupabaseBrowserClientAsync();
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refresh();
        router.push("/diaries");
        router.refresh();
      } else {
        if (!fullName.trim()) throw new Error("请填写昵称");
        if (password.length < 6) throw new Error("密码至少 6 位");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        const token = data.session?.access_token ?? (await getSessionToken());
        if (token) {
          // 同步创建/更新用户资料
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-session": token },
            body: JSON.stringify({ full_name: fullName.trim() }),
          }).catch(() => {});
          await refresh();
          router.push("/diaries");
          router.refresh();
        } else {
          setNotice("注册成功！请前往邮箱收件箱确认激活链接，然后登录。");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="diary-paper rounded-2xl border border-border/70 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <BookHeart className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {isLogin ? "欢迎回来" : "创建账号"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? "登录后继续记录今天的心情" : "加入 AI日记社区，开始你的日记之旅"}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <Label htmlFor="fullName">昵称</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="你的显示昵称"
                autoComplete="nickname"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "输入密码" : "至少 6 位密码"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="显示/隐藏密码"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{notice}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 请稍候…
              </>
            ) : isLogin ? (
              "登录"
            ) : (
              "注册"
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>
              还没有账号？{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                立即注册
              </Link>
            </>
          ) : (
            <>
              已有账号？{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                去登录
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}