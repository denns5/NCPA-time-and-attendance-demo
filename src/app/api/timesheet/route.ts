import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db/index";
import { employees, schedules, timesheets, timeEntries, leaveBalances } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Current pay period for the demo (July 2024)
const CURRENT_PP_START = "2024-07-01";
const CURRENT_PP_END = "2024-07-14";

/**
 * GET /api/timesheet?employeeId=1&ppStart=2024-07-01&ppEnd=2024-07-14
 *
 * Returns everything the timesheet page needs:
 *  - employee info (name, schedule_type, employee_type)
 *  - schedule entries for the pay period
 *  - existing timesheet + time entries (if any)
 *  - leave balances
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = Number(searchParams.get("employeeId"));
  const ppStart = searchParams.get("ppStart") || CURRENT_PP_START;
  const ppEnd = searchParams.get("ppEnd") || CURRENT_PP_END;

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  // Employee info
  const employee = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .then((rows) => rows[0]);

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Schedule entries for the pay period
  const scheduleEntries = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.employeeId, employeeId),
        gte(schedules.date, ppStart),
        lte(schedules.date, ppEnd)
      )
    );

  // Existing timesheet for this pay period
  const existingTimesheet = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.employeeId, employeeId),
        eq(timesheets.payPeriodStart, ppStart),
        eq(timesheets.payPeriodEnd, ppEnd)
      )
    )
    .then((rows) => rows[0] || null);

  // Time entries if timesheet exists
  let entries: typeof timeEntries.$inferSelect[] = [];
  if (existingTimesheet) {
    entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.timesheetId, existingTimesheet.id));
  }

  // Leave balances
  const balances = await db
    .select()
    .from(leaveBalances)
    .where(eq(leaveBalances.employeeId, employeeId));

  // Available pay periods for the dropdown (demo: June-July 2024)
  const payPeriods = [
    { start: "2024-06-01", end: "2024-06-15", label: "Jun 1 – Jun 15, 2024" },
    { start: "2024-06-16", end: "2024-06-30", label: "Jun 16 – Jun 30, 2024" },
    { start: "2024-07-01", end: "2024-07-14", label: "Jul 1 – Jul 14, 2024" },
    { start: "2024-07-15", end: "2024-07-28", label: "Jul 15 – Jul 28, 2024" },
  ];

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      employeeType: employee.employeeType,
      scheduleType: employee.scheduleType,
      location: employee.location,
      department: employee.department,
      jobClassification: employee.jobClassification,
    },
    schedule: scheduleEntries,
    timesheet: existingTimesheet,
    timeEntries: entries,
    leaveBalances: balances.map((b) => ({
      leaveType: b.leaveType,
      balanceHours: b.balanceHours,
      capHours: b.capHours,
    })),
    payPeriods,
    currentPayPeriod: { start: ppStart, end: ppEnd },
  });
}

/**
 * POST /api/timesheet
 *
 * Save (draft) or submit a timesheet.
 * Body: { employeeId, ppStart, ppEnd, action: "save"|"submit", entries: [...], overrideNote? }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    employeeId,
    ppStart,
    ppEnd,
    action,
    entries,
    overrideNote,
  }: {
    employeeId: number;
    ppStart: string;
    ppEnd: string;
    action: "save" | "submit";
    entries: Array<{
      date: string;
      payCode: string;
      hours: number;
      projectCode?: string;
      costCode?: string;
      notes?: string;
      isAutoCalculated?: boolean;
    }>;
    overrideNote?: string;
  } = body;

  // Check for existing timesheet
  const existing = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.employeeId, employeeId),
        eq(timesheets.payPeriodStart, ppStart),
        eq(timesheets.payPeriodEnd, ppEnd)
      )
    )
    .then((rows) => rows[0] || null);

  // Don't allow editing submitted/approved/processed timesheets (unless rejected)
  if (
    existing &&
    existing.status !== "draft" &&
    existing.status !== "rejected"
  ) {
    return NextResponse.json(
      { error: `Timesheet is already ${existing.status}` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const status = action === "submit" ? "submitted" : "draft";

  // Use a transaction for atomicity
  const result = sqlite.transaction(() => {
    let timesheetId: number;

    if (existing) {
      // Update existing timesheet
      sqlite
        .prepare(
          `UPDATE timesheets SET status = ?, submitted_at = ?, rejection_reason = NULL WHERE id = ?`
        )
        .run(status, action === "submit" ? now : existing.submittedAt, existing.id);
      timesheetId = existing.id;

      // Delete old entries
      sqlite
        .prepare(`DELETE FROM time_entries WHERE timesheet_id = ?`)
        .run(timesheetId);
    } else {
      // Create new timesheet
      const res = sqlite
        .prepare(
          `INSERT INTO timesheets (employee_id, pay_period_start, pay_period_end, status, submitted_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(employeeId, ppStart, ppEnd, status, action === "submit" ? now : null);
      timesheetId = Number(res.lastInsertRowid);
    }

    // Insert new entries
    const insertEntry = sqlite.prepare(
      `INSERT INTO time_entries (timesheet_id, date, pay_code, hours, project_code, cost_code, notes, is_auto_calculated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const entry of entries) {
      if (entry.hours > 0) {
        insertEntry.run(
          timesheetId,
          entry.date,
          entry.payCode,
          entry.hours,
          entry.projectCode || null,
          entry.costCode || null,
          entry.notes || null,
          entry.isAutoCalculated ? 1 : 0
        );
      }
    }

    // If override note, log it
    if (overrideNote) {
      sqlite
        .prepare(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          employeeId,
          "timesheet_override",
          "timesheet",
          timesheetId,
          null,
          JSON.stringify({ note: overrideNote }),
          now
        );
    }

    // If submitting, create notification for supervisor
    if (action === "submit") {
      const emp = sqlite
        .prepare(`SELECT name, supervisor_id FROM employees WHERE id = ?`)
        .get(employeeId) as { name: string; supervisor_id: number | null };

      if (emp?.supervisor_id) {
        sqlite
          .prepare(
            `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            emp.supervisor_id,
            "timesheet_submitted",
            "Timesheet Submitted",
            `${emp.name} submitted timesheet for ${ppStart} to ${ppEnd}`,
            0,
            now,
            "/dashboard/approvals"
          );
      }
    }

    return { timesheetId, status };
  })();

  return NextResponse.json({ success: true, ...result });
}
