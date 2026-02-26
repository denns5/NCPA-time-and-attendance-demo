import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db/index";
import { employees, leaveBalances, leaveRequests, schedules } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import type { LeaveBalanceDetail, LeaveRequest as LeaveRequestType, LeaveType } from "@/lib/leave-types";

// Demo context: July 2024
const DEMO_YEAR = 2024;
const PERIODS_ELAPSED = 13; // ~13 biweekly periods Jan–Jun 2024
const TOTAL_PERIODS_PER_YEAR = 26;

/**
 * GET /api/leave?employeeId=1
 *
 * Returns leave balances (with YTD breakdown), leave requests, and upcoming schedule.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = Number(searchParams.get("employeeId"));

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

  // Leave balances
  const rawBalances = await db
    .select()
    .from(leaveBalances)
    .where(eq(leaveBalances.employeeId, employeeId));

  // Leave requests for YTD usage calc
  const allRequests = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.employeeId, employeeId));

  // Compute YTD used per leave type (approved + pending requests in demo year)
  const ytdUsedByType: Record<string, number> = {};
  for (const req of allRequests) {
    if (
      (req.status === "approved" || req.status === "pending") &&
      req.startDate.startsWith(String(DEMO_YEAR))
    ) {
      ytdUsedByType[req.leaveType] = (ytdUsedByType[req.leaveType] || 0) + req.totalHours;
    }
  }

  // Build balance details with YTD breakdown
  const balances: LeaveBalanceDetail[] = rawBalances.map((b) => {
    const ytdAccrued = b.accrualRatePerPeriod * PERIODS_ELAPSED;
    const ytdUsed = ytdUsedByType[b.leaveType] || 0;
    const boyBalance = b.balanceHours - ytdAccrued + ytdUsed;
    const remainingPeriods = TOTAL_PERIODS_PER_YEAR - PERIODS_ELAPSED;
    let projectedBalance = b.balanceHours + b.accrualRatePerPeriod * remainingPeriods;
    if (b.capHours !== null) {
      projectedBalance = Math.min(projectedBalance, b.capHours);
    }
    const percentOfCap = b.capHours ? Math.round((b.balanceHours / b.capHours) * 100) : null;

    return {
      leaveType: b.leaveType as LeaveType,
      balanceHours: b.balanceHours,
      accrualRatePerPeriod: b.accrualRatePerPeriod,
      capHours: b.capHours,
      boyBalance: Math.max(0, Math.round(boyBalance * 100) / 100),
      ytdAccrued: Math.round(ytdAccrued * 100) / 100,
      ytdUsed,
      projectedBalance: Math.round(projectedBalance * 100) / 100,
      percentOfCap,
    };
  });

  // Format leave requests
  const requests: LeaveRequestType[] = allRequests
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((r) => ({
      id: r.id,
      leaveType: r.leaveType as LeaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      totalHours: r.totalHours,
      status: r.status as LeaveRequestType["status"],
      submittedAt: r.submittedAt,
      decidedAt: r.decidedAt,
      decisionNotes: r.decisionNotes,
    }));

  // Schedule for next 60 days from demo start (July 2024)
  const scheduleEntries = await db
    .select({ date: schedules.date, shiftCode: schedules.shiftCode })
    .from(schedules)
    .where(
      and(
        eq(schedules.employeeId, employeeId),
        gte(schedules.date, "2024-07-01"),
        lte(schedules.date, "2024-08-31")
      )
    );

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
    balances,
    requests,
    schedule: scheduleEntries,
  });
}

/**
 * POST /api/leave
 *
 * Actions: submit_request, cancel_request, sell_back, transfer
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body as { action: string };
  const now = new Date().toISOString();

  switch (action) {
    case "submit_request": {
      const { employeeId, leaveType, startDate, endDate, totalHours, notes } = body as {
        employeeId: number;
        leaveType: LeaveType;
        startDate: string;
        endDate: string;
        totalHours: number;
        notes?: string;
      };

      // Validate balance
      const balance = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.employeeId, employeeId),
            eq(leaveBalances.leaveType, leaveType)
          )
        )
        .then((rows) => rows[0]);

      if (!balance) {
        return NextResponse.json({ error: "No balance found for this leave type" }, { status: 400 });
      }

      // Sum pending/approved hours for this leave type in the same year
      const existingRequests = await db
        .select()
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.employeeId, employeeId),
            eq(leaveRequests.leaveType, leaveType),
            inArray(leaveRequests.status, ["pending", "approved"])
          )
        );

      const committedHours = existingRequests.reduce((sum, r) => sum + r.totalHours, 0);
      const availableHours = balance.balanceHours - committedHours;

      if (totalHours > availableHours) {
        return NextResponse.json(
          { error: `Insufficient balance. Available: ${availableHours}h, Requested: ${totalHours}h` },
          { status: 400 }
        );
      }

      const result = sqlite.transaction(() => {
        // Get supervisor
        const emp = sqlite
          .prepare("SELECT name, supervisor_id FROM employees WHERE id = ?")
          .get(employeeId) as { name: string; supervisor_id: number | null };

        // Insert leave request
        const res = sqlite
          .prepare(
            `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_hours, status, approver_id, submitted_at, decided_at, decision_notes)
             VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NULL, ?)`
          )
          .run(employeeId, leaveType, startDate, endDate, totalHours, emp?.supervisor_id || null, now, notes || null);

        const requestId = Number(res.lastInsertRowid);

        // Notify supervisor
        if (emp?.supervisor_id) {
          sqlite
            .prepare(
              `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
               VALUES (?, 'leave_request', 'Leave Request', ?, 0, ?, '/dashboard/approvals')`
            )
            .run(
              emp.supervisor_id,
              `${emp.name} requested ${totalHours}h of ${leaveType} leave (${startDate} to ${endDate})`,
              now
            );
        }

        // Audit log
        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'leave_request_submitted', 'leave_request', ?, NULL, ?, ?)`
          )
          .run(
            employeeId,
            requestId,
            JSON.stringify({ leaveType, startDate, endDate, totalHours }),
            now
          );

        return { requestId };
      })();

      return NextResponse.json({ success: true, ...result });
    }

    case "cancel_request": {
      const { requestId, employeeId } = body as { requestId: number; employeeId: number };

      const req = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.id, requestId))
        .then((rows) => rows[0]);

      if (!req) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }
      if (req.status !== "pending") {
        return NextResponse.json({ error: "Only pending requests can be cancelled" }, { status: 400 });
      }

      sqlite.transaction(() => {
        sqlite
          .prepare("UPDATE leave_requests SET status = 'cancelled', decided_at = ? WHERE id = ?")
          .run(now, requestId);

        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'leave_request_cancelled', 'leave_request', ?, ?, ?, ?)`
          )
          .run(
            employeeId,
            requestId,
            JSON.stringify({ status: "pending" }),
            JSON.stringify({ status: "cancelled" }),
            now
          );
      })();

      return NextResponse.json({ success: true });
    }

    case "sell_back": {
      const { employeeId, hours } = body as { employeeId: number; hours: number };

      if (hours <= 0) {
        return NextResponse.json({ error: "Hours must be positive" }, { status: 400 });
      }

      const balance = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.employeeId, employeeId),
            eq(leaveBalances.leaveType, "vacation")
          )
        )
        .then((rows) => rows[0]);

      if (!balance || balance.balanceHours < hours) {
        return NextResponse.json({ error: "Insufficient vacation balance" }, { status: 400 });
      }

      sqlite.transaction(() => {
        const oldBalance = balance.balanceHours;
        const newBalance = oldBalance - hours;

        sqlite
          .prepare("UPDATE leave_balances SET balance_hours = ? WHERE id = ?")
          .run(newBalance, balance.id);

        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'vacation_sell_back', 'leave_balance', ?, ?, ?, ?)`
          )
          .run(
            employeeId,
            balance.id,
            JSON.stringify({ balanceHours: oldBalance }),
            JSON.stringify({ balanceHours: newBalance, soldHours: hours }),
            now
          );
      })();

      return NextResponse.json({ success: true });
    }

    case "transfer": {
      const { employeeId, fromType, toType, hours } = body as {
        employeeId: number;
        fromType: LeaveType;
        toType: LeaveType;
        hours: number;
      };

      if (hours <= 0) {
        return NextResponse.json({ error: "Hours must be positive" }, { status: 400 });
      }

      // Validate transfer is allowed
      const allowedTransfers: Record<string, string[]> = {
        comp: ["vacation"],
        holiday_bank: ["vacation"],
      };
      if (!allowedTransfers[fromType]?.includes(toType)) {
        return NextResponse.json({ error: "This transfer is not allowed" }, { status: 400 });
      }

      const sourceBalance = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.employeeId, employeeId),
            eq(leaveBalances.leaveType, fromType)
          )
        )
        .then((rows) => rows[0]);

      const destBalance = await db
        .select()
        .from(leaveBalances)
        .where(
          and(
            eq(leaveBalances.employeeId, employeeId),
            eq(leaveBalances.leaveType, toType)
          )
        )
        .then((rows) => rows[0]);

      if (!sourceBalance || sourceBalance.balanceHours < hours) {
        return NextResponse.json({ error: "Insufficient source balance" }, { status: 400 });
      }
      if (!destBalance) {
        return NextResponse.json({ error: "Destination balance not found" }, { status: 400 });
      }

      sqlite.transaction(() => {
        const oldSource = sourceBalance.balanceHours;
        const oldDest = destBalance.balanceHours;

        sqlite
          .prepare("UPDATE leave_balances SET balance_hours = ? WHERE id = ?")
          .run(oldSource - hours, sourceBalance.id);

        let newDest = oldDest + hours;
        if (destBalance.capHours !== null) {
          newDest = Math.min(newDest, destBalance.capHours);
        }
        sqlite
          .prepare("UPDATE leave_balances SET balance_hours = ? WHERE id = ?")
          .run(newDest, destBalance.id);

        sqlite
          .prepare(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
             VALUES (?, 'leave_transfer', 'leave_balance', ?, ?, ?, ?)`
          )
          .run(
            employeeId,
            sourceBalance.id,
            JSON.stringify({ fromType, fromBalance: oldSource, toType, toBalance: oldDest }),
            JSON.stringify({ fromBalance: oldSource - hours, toBalance: newDest, transferredHours: hours }),
            now
          );
      })();

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
