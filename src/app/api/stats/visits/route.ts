import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface VisitStats {
  today: number;
  total: number;
  uniqueVisitors: number;
}

async function getStats(): Promise<VisitStats> {
  const db = client();
  const todayRow = await db
    .from("site_visits")
    .select("visitor_token", { count: "exact", head: true })
    .eq("visit_date", new Date().toISOString().slice(0, 10));

  const totalRow = await db
    .from("site_visits")
    .select("visitor_token", { count: "exact", head: true });

  const uniqueRow = await db
    .from("site_visits")
    .select("visitor_token");

  const unique = new Set(uniqueRow.data?.map((r) => r.visitor_token)).size;

  return {
    today: todayRow.count ?? 0,
    total: totalRow.count ?? 0,
    uniqueVisitors: unique,
  };
}

/** GET /api/stats/visits  返回今日访客 / 累计访问 / 独立访客数 */
export async function GET() {
  return NextResponse.json({ stats: await getStats() });
}

/** POST /api/stats/visits  记录一次真人访问（同一浏览器每天只计一次） */
export async function POST(req: NextRequest) {
  let visitorToken = "";
  let path = "";
  try {
    const body = await req.json();
    visitorToken = String(body.visitorToken ?? "").trim().slice(0, 64);
    path = String(body.path ?? "").trim().slice(0, 255);
  } catch {
    return NextResponse.json({ error: "请求格式不正确" }, { status: 400 });
  }
  if (!visitorToken)
    return NextResponse.json({ error: "缺少访客标识" }, { status: 400 });

  const user = await getCurrentUser(req);
  const visitDate = new Date().toISOString().slice(0, 10);

  // 同一 visitor_token + 日期唯一；当天重复访问不重复计数
  const { error } = await client()
    .from("site_visits")
    .upsert(
      {
        visitor_token: visitorToken,
        user_id: user?.id ?? null,
        path,
        visit_date: visitDate,
      },
      { onConflict: "visitor_token,visit_date", ignoreDuplicates: true },
    );
  if (error)
    return NextResponse.json({ error: "记录失败" }, { status: 500 });

  return NextResponse.json({ stats: await getStats() });
}
