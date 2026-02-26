import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db/index";
import { employees, timesheets, timeEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const PAY_PERIODS = [
  { start: "2024-06-01", end: "2024-06-15", label: "Jun 1 – Jun 15, 2024" },
  { start: "2024-06-16", end: "2024-06-30", label: "Jun 16 – Jun 30, 2024" },
  { start: "2024-07-01", end: "2024-07-14", label: "Jul 1 – Jul 14, 2024" },
  { start: "2024-07-15", end: "2024-07-28", label: "Jul 15 – Jul 28, 2024" },
];

export async function GET() {
  const allEmployees = await db.select().from(employees);
  const allTimesheets = await db.select().from(timesheets);
  const allEntries = await db.select().from(timeEntries);

  const periods = PAY_PERIODS.map((pp) => {
    const ppTimesheets = allTimesheets.filter(
      (ts) => ts.payPeriodStart === pp.start && ts.payPeriodEnd === pp.end
    );

    const draftCount = ppTimesheets.filter((t) => t.status === "draft").length;
    const submittedCount = ppTimesheets.filter((t) => t.status === "submitted").length;
    const approvedCount = ppTimesheets.filter((t) => t.status === "approved").length;
    const processedCount = ppTimesheets.filter((t) => t.status === "processed").length;
    const rejectedCount = ppTimesheets.filter((t) => t.status === "rejected").length;

    // Total hours for this period
    let totalHours = 0;
    for (const ts of ppTimesheets) {
      const entries = allEntries.filter((e) => e.timesheetId === ts.id);
      totalHours += entries.reduce((sum, e) => sum + e.hours, 0);
    }

    // Determine period status
    let status: string;
    if (processedCount > 0 && processedCount === ppTimesheets.length) {
      status = "processed";
    } else if (approvedCount > 0 && approvedCount + processedCount === ppTimesheets.length) {
      status = "ready";
    } else if (ppTimesheets.length === 0) {
      status = "open";
    } else {
      status = "in_progress";
    }

    const totalEmployees = allEmployees.length;
    const percentComplete = ppTimesheets.length > 0
      ? Math.round(((approvedCount + processedCount) / totalEmployees) * 100)
      : 0;

    // Employee detail
    const employeeDetail = allEmployees.map((emp) => {
      const ts = ppTimesheets.find((t) => t.employeeId === emp.id);
      const entries = ts ? allEntries.filter((e) => e.timesheetId === ts.id) : [];
      const hours = entries.reduce((sum, e) => sum + e.hours, 0);
      return {
        id: emp.id,
        name: emp.name,
        employeeType: emp.employeeType,
        timesheetStatus: ts?.status || "not_started",
        totalHours: Math.round(hours * 100) / 100,
      };
    });

    return {
      ...pp,
      status,
      timesheetCount: ppTimesheets.length,
      totalEmployees,
      draftCount,
      submittedCount,
      approvedCount,
      processedCount,
      rejectedCount,
      totalHours: Math.round(totalHours * 100) / 100,
      percentComplete,
      employees: employeeDetail,
    };
  });

  return NextResponse.json({ periods });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body as { action: string };

  if (action === "process") {
    const { ppStart, ppEnd, adminId } = body as {
      ppStart: string;
      ppEnd: string;
      adminId: number;
    };
    const now = new Date().toISOString();

    // Find all approved timesheets for this period
    const approved = await db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.payPeriodStart, ppStart),
          eq(timesheets.payPeriodEnd, ppEnd),
          eq(timesheets.status, "approved")
        )
      );

    if (approved.length === 0) {
      return NextResponse.json({ error: "No approved timesheets to process" }, { status: 400 });
    }

    sqlite.transaction(() => {
      for (const ts of approved) {
        sqlite
          .prepare("UPDATE timesheets SET status = 'processed' WHERE id = ?")
          .run(ts.id);
      }

      sqlite
        .prepare(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, 'pay_period_processed', 'pay_period', NULL, ?, ?, ?)`
        )
        .run(
          adminId,
          JSON.stringify({ period: `${ppStart} to ${ppEnd}`, count: approved.length }),
          JSON.stringify({ status: "processed", processedCount: approved.length }),
          now
        );
    })();

    return NextResponse.json({ success: true, processedCount: approved.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
