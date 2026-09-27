import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDrawComments, addDrawComment, getDrawOwner } from "@/lib/tarot-db";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/** GET/POST /api/tarot/draws/[drawId]/comments */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ drawId: string }> },
) {
  const { drawId } = await params;
  try {
    const comments = await getDrawComments(drawId);
    return NextResponse.json({ comments });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ drawId: string }> },
) {
  const { drawId } = await params;
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { content?: string };
  if (!body.content || !body.content.trim()) {
    return NextResponse.json({ error: "留言内容不能为空" }, { status: 400 });
  }
  try {
    const comment = await addDrawComment(drawId, user.id, body.content);
    const ownerId = await getDrawOwner(drawId);
    if (ownerId) {
      void createNotification({
        userId: ownerId,
        actorId: user.id,
        actorIsAi: false,
        type: "tarot_comment",
        targetId: drawId,
        content: body.content.trim(),
      }).catch(() => {});
    }
    return NextResponse.json({ comment });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}