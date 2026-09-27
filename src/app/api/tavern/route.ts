import { NextRequest, NextResponse } from "next/server";
import { getTavernFeed } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(30, Math.max(1, Number(sp.get("limit")) || 12));
    const cursor = sp.get("cursor") || undefined;
    const slug = sp.get("slug") || undefined;
    const diaries = await getTavernFeed({ limit, cursor, slug });
    return NextResponse.json({
      diaries,
      cursor: diaries.length ? diaries[diaries.length - 1].created_at : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";