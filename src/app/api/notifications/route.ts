import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount, listNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("unread") === "1") {
    const unread = await getUnreadCount(user.id);
    return NextResponse.json({ unread });
  }
  const items = await listNotifications(user.id);
  const unread = await getUnreadCount(user.id);
  return NextResponse.json({ notifications: items, unread });
}