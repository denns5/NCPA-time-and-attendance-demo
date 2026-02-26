import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { auditLog, employees } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  // Fetch all audit log entries with actor names
  const entries = await db
    .select({
      id: auditLog.id,
      userId: auditLog.userId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      oldValue: auditLog.oldValue,
      newValue: auditLog.newValue,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt));

  // Fetch all employee names for lookup
  const users = await db.select({ id: employees.id, name: employees.name }).from(employees);
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const enriched = entries.map((e) => ({
    ...e,
    userName: e.userId ? userMap.get(e.userId) || `User #${e.userId}` : "System",
  }));

  // Get unique actions and entity types for filters
  const actions = Array.from(new Set(entries.map((e) => e.action))).sort();
  const entityTypes = Array.from(new Set(entries.map((e) => e.entityType))).sort();

  return NextResponse.json({ entries: enriched, actions, entityTypes });
}
