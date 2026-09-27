"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";
import { authedFetch } from "@/lib/session-context";

interface VisitStats {
  today: number;
  total: number;
  uniqueVisitors: number;
}

function getVisitorToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem("visitor_token");
  if (!token) {
    token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem("visitor_token", token);
  }
  return token;
}

export function SiteVisitsTracker() {
  const pathname = usePathname();
  const [stats, setStats] = useState<VisitStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const visitorToken = getVisitorToken();
      // 记录本次访问（同一天刷新不重复计数）
      const res = await authedFetch("/api/stats/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorToken, path: pathname }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setStats(data.stats);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // 仅在每次路由切换时记录一次
  }, [pathname]);

  if (!stats) return null;

  return (
    <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <Eye className="h-3.5 w-3.5" />
      今日 {stats.today} 人到访 · 累计 {stats.total} 次访问 · {stats.uniqueVisitors} 位访客
    </p>
  );
}
