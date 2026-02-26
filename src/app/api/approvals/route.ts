import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db/index";
import { employees, timesheets, timeEntries, leaveRequests } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supervisorId = Number(searchParams.get("supervisorId"));

  if (!supervisorId) {
    return NextResponse.json({ error: "supervisorId required" }, { status: 400 });
  }

  // Get team member IDs
  const teamMembers = await db
    .select()
    .from(employees)
    .where(eq(employees.supervisorId, supervisorId));

  const teamIds = teamMembers.map((e) => e.id);
  if (teamIds.length === 0) {
    return NextResponse.json({ submittedTimesheets: [], pendingLeave: [] });
  }

  // Submitted timesheets
  const submitted = await db
    .select()
    .from(timesheets)
    .where(
      and(
        inArray(timesheets.employeeId, teamIds),
        eq(timesheets.status, "submitted")
      )
    );

  // Get time entries for each submitted timesheet
  const timesheetData = [];
  for (const ts of submitted) {
    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.timesheetId, ts.id));

    const emp = teamMembers.find((e) => e.id === ts.employeeId);

    // Summarize hours by pay code
    const hoursByCode: Record<string, number> = {};
    let totalHours = 0;
    for (const entry of entries) {
      hoursByCode[entry.payCode] = (hoursByCode[entry.payCode] || 0) + entry.hours;
      totalHours += entry.hours;
    }

    timesheetData.push({
      id: ts.id,
      employeeId: ts.employeeId,
      employeeName: emp?.name || "Unknown",
      employeeType: emp?.employeeType || "",
      payPeriodStart: ts.payPeriodStart,
      payPeriodEnd: ts.payPeriodEnd,
      submittedAt: ts.submittedAt,
      hoursByCode,
      totalHours: Math.round(totalHours * 100) / 100,
      entryCount: entries.length,
    });
  }

  // Pending leave requests
  const pendingLeave = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        inArray(leaveRequests.employeeId, teamIds),
        eq(leaveRequests.status, "pending")
      )
    );

  const leaveData = pendingLeave.map((lr) => {
    const emp = teamMembers.find((e) => e.id === lr.employeeId);
    return {
      id: lr.id,
      employeeId: lr.employeeId,
      employeeName: emp?.name || "Unknown",
      leaveType: lr.leaveType,
      startDate: lr.startDate,
      endDate: lr.endDate,
      totalHours: lr.totalHours,
      submittedAt: lr.submittedAt,
    };
  });

  return NextResponse.json({
    submittedTimesheets: timesheetData,
    pendingLeave: leaveData,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body as { action: string };
  const now = new Date().toISOString();

  switch (action) {
    case "approve_timesheet": {
      const { timesheetId, supervisorId } = body as {
        timesheetId: number;
        supervisorId: number;
      };

      const ts = await db
        .select()
        .from(timesheets)
        .where(eq(timesheets.id, timesheetId))
        .then((rows) => rows[0]);

      if (!ts || ts.status !== "submitted") {
        return NextResponse.json({ error: "Timesheet not found or not submitted" }, { status: 400 });
      }

      sqlite.transaction(() => {
        sqlite
          .prepare("UPDATE timesheets SET status = 'approved', approved_at = ?, approved_by = ? WHERE id = ?")
          .run(now, supervisorId, timesheetId);

        // Notify employee
        sqlite
          .prepare(
            `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
             VALUES (?, 'timesheet_approved', 'Timesheet Approved', ?, 0, ?, '/dashboard/timesheet')`
          )
          .run(
            ts.employeeId,
            `Your timesheet for ${ts.payPeriodStart} to ${ts.payPeriodEnd} has been approved.`,
            now
          );

        // Audit log
        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'timesheet_approved', 'timesheet', ?, ?, ?, ?)`
          )
          .run(
            supervisorId,
            timesheetId,
            JSON.stringify({ status: "submitted" }),
            JSON.stringify({ status: "approved", approvedBy: supervisorId }),
            now
          );
      })();

      return NextResponse.json({ success: true });
    }

    case "reject_timesheet": {
      const { timesheetId, supervisorId, notes } = body as {
        timesheetId: number;
        supervisorId: number;
        notes: string;
      };

      if (!notes) {
        return NextResponse.json({ error: "Rejection notes required" }, { status: 400 });
      }

      const ts = await db
        .select()
        .from(timesheets)
        .where(eq(timesheets.id, timesheetId))
        .then((rows) => rows[0]);

      if (!ts || ts.status !== "submitted") {
        return NextResponse.json({ error: "Timesheet not found or not submitted" }, { status: 400 });
      }

      sqlite.transaction(() => {
        sqlite
          .prepare("UPDATE timesheets SET status = 'rejected', rejection_reason = ? WHERE id = ?")
          .run(notes, timesheetId);

        sqlite
          .prepare(
            `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
             VALUES (?, 'timesheet_rejected', 'Timesheet Rejected', ?, 0, ?, '/dashboard/timesheet')`
          )
          .run(
            ts.employeeId,
            `Your timesheet for ${ts.payPeriodStart} to ${ts.payPeriodEnd} was rejected: ${notes}`,
            now
          );

        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'timesheet_rejected', 'timesheet', ?, ?, ?, ?)`
          )
          .run(
            supervisorId,
            timesheetId,
            JSON.stringify({ status: "submitted" }),
            JSON.stringify({ status: "rejected", reason: notes }),
            now
          );
      })();

      return NextResponse.json({ success: true });
    }

    case "approve_leave": {
      const { requestId, supervisorId } = body as {
        requestId: number;
        supervisorId: number;
      };

      const lr = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId))
        .then((rows) => rows[0]);

      if (!lr || lr.status !== "pending") {
        return NextResponse.json({ error: "Leave request not found or not pending" }, { status: 400 });
      }

      sqlite.transaction(() => {
        sqlite
          .prepare("UPDATE leave_requests SET status = 'approved', decided_at = ? WHERE id = ?")
          .run(now, requestId);

        sqlite
          .prepare(
            `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
             VALUES (?, 'leave_approved', 'Leave Approved', ?, 0, ?, '/dashboard/leave')`
          )
          .run(
            lr.employeeId,
            `Your ${lr.leaveType} leave request (${lr.startDate} to ${lr.endDate}) has been approved.`,
            now
          );

        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'leave_approved', 'leave_request', ?, ?, ?, ?)`
          )
          .run(
            supervisorId,
            requestId,
            JSON.stringify({ status: "pending" }),
            JSON.stringify({ status: "approved" }),
            now
          );
      })();

      return NextResponse.json({ success: true });
    }

    case "reject_leave": {
      const { requestId, supervisorId, notes } = body as {
        requestId: number;
        supervisorId: number;
        notes: string;
      };

      if (!notes) {
        return NextResponse.json({ error: "Rejection notes required" }, { status: 400 });
      }

      const lr = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId))
        .then((rows) => rows[0]);

      if (!lr || lr.status !== "pending") {
        return NextResponse.json({ error: "Leave request not found or not pending" }, { status: 400 });
      }

      sqlite.transaction(() => {
        sqlite
          .prepare("UPDATE leave_requests SET status = 'rejected', decided_at = ?, decision_notes = ? WHERE id = ?")
          .run(now, notes, requestId);

        sqlite
          .prepare(
            `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
             VALUES (?, 'leave_rejected', 'Leave Rejected', ?, 0, ?, '/dashboard/leave')`
          )
          .run(
            lr.employeeId,
            `Your ${lr.leaveType} leave request (${lr.startDate} to ${lr.endDate}) was rejected: ${notes}`,
            now
          );

        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'leave_rejected', 'leave_request', ?, ?, ?, ?)`
          )
          .run(
            supervisorId,
            requestId,
            JSON.stringify({ status: "pending" }),
            JSON.stringify({ status: "rejected", reason: notes }),
            now
          );
      })();

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
