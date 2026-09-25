import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ user: null });
    }
    const profile = await getProfile(user.id);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name ?? user.fullName,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取用户失败" },
      { status: 500 }
    );
  }
}