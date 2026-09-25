import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export interface AuthedUser {
  id: string;
  email?: string;
  fullName: string;
}

/** 从请求 x-session header 解析并校验登录用户，未登录返回 null */
export async function getCurrentUser(req: NextRequest): Promise<AuthedUser | null> {
  const token = req.headers.get("x-session");
  if (!token) return null;
  const client = getSupabaseClient(token);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  const user = data.user;
  const metaFull = user.user_metadata?.full_name as string | undefined;
  const fullName =
    metaFull && metaFull.trim()
      ? metaFull.trim()
      : (user.email?.split("@")[0] ?? "日记人");
  return { id: user.id, email: user.email, fullName };
}