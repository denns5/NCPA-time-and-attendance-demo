import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db/index";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = Number(searchParams.get("userId"));

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  const unreadCount = items.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications: items, unreadCount });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body as { action: string };

  switch (action) {
    case "mark_read": {
      const { notificationId } = body as { notificationId: number };
      sqlite
        .prepare("UPDATE notifications SET is_read = 1 WHERE id = ?")
        .run(notificationId);
      return NextResponse.json({ success: true });
    }

    case "mark_all_read": {
      const { userId } = body as { userId: number };
      sqlite
        .prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0")
        .run(userId);
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
