"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import {
  getSupabaseBrowserClientWithRetry,
} from "@/lib/supabase-browser";

export interface SessionUser {
  id: string;
  email?: string;
  full_name: string;
}

interface SessionContextType {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function useSession() {
  return useContext(SessionContext);
}

/** 获取当前登录 token（无则返回 null） */
export async function getSessionToken(): Promise<string | null> {
  try {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** 携带登录态的 fetch */
export async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getSessionToken();
  return fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { "x-session": token } : {}),
    },
  });
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getSessionToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/me", { headers: { "x-session": token } });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}