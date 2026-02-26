import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db/index";
import { employees, schedules } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const supervisorId = Number(searchParams.get("supervisorId"));

  if (!supervisorId) {
    return NextResponse.json({ error: "supervisorId required" }, { status: 400 });
  }

  // Get team members
  const teamMembers = await db
    .select()
    .from(employees)
    .where(eq(employees.supervisorId, supervisorId));

  const teamIds = teamMembers.map((e) => e.id);
  if (teamIds.length === 0) {
    return NextResponse.json({ team: [], schedules: [], month: "2024-07", reliefOperators: [] });
  }

  // Get all July 2024 schedules for team
  const allSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        inArray(schedules.employeeId, teamIds),
        gte(schedules.date, "2024-07-01"),
        lte(schedules.date, "2024-07-31")
      )
    );

  // Identify relief operators (Jeff P id=7, Ryan D id=13, Jim M id=14)
  const reliefOps = teamMembers.filter((e) =>
    e.jobClassification.toLowerCase().includes("relief")
  );

  return NextResponse.json({
    team: teamMembers.map((e) => ({
      id: e.id,
      name: e.name,
      jobClassification: e.jobClassification,
      isRelief: reliefOps.some((r) => r.id === e.id),
    })),
    schedules: allSchedules,
    month: "2024-07",
    reliefOperators: reliefOps.map((e) => ({
      id: e.id,
      name: e.name,
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body as { action: string };
  const now = new Date().toISOString();

  if (action === "assign_coverage") {
    const { employeeId, date, reliefId, supervisorId, startTime, endTime } = body as {
      employeeId: number;
      date: string;
      reliefId: number;
      supervisorId: number;
      startTime: string;
      endTime: string;
    };

    sqlite.transaction(() => {
      // Update the X code to C for the original employee's slot
      sqlite
        .prepare(
          `UPDATE schedules SET shift_code = 'C', start_time = ?, end_time = ?, is_modified = 1, modified_by = ?, notes = ? WHERE employee_id = ? AND date = ?`
        )
        .run(startTime, endTime, supervisorId, `Covered by relief`, employeeId, date);

      // Check if relief already has a schedule entry for that date
      const existing = sqlite
        .prepare("SELECT id FROM schedules WHERE employee_id = ? AND date = ?")
        .get(reliefId, date) as { id: number } | undefined;

      if (existing) {
        sqlite
          .prepare(
            `UPDATE schedules SET shift_code = 'C', start_time = ?, end_time = ?, is_modified = 1, modified_by = ?, notes = ? WHERE id = ?`
          )
          .run(startTime, endTime, supervisorId, `Coverage assignment`, existing.id);
      } else {
        sqlite
          .prepare(
            `INSERT INTO schedules (employee_id, date, shift_code, start_time, end_time, is_modified, modified_by, notes)
             VALUES (?, ?, 'C', ?, ?, 1, ?, ?)`
          )
          .run(reliefId, date, startTime, endTime, supervisorId, `Coverage assignment`);
      }

      // Notify the relief operator
      sqlite
        .prepare(
          `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
           VALUES (?, 'schedule_change', 'Coverage Assignment', ?, 0, ?, '/dashboard/schedule')`
        )
        .run(reliefId, `You have been assigned coverage on ${date}`, now);

      // Audit log
      sqlite
        .prepare(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, 'coverage_assigned', 'schedule', ?, ?, ?, ?)`
        )
        .run(
          supervisorId,
          employeeId,
          JSON.stringify({ shiftCode: "X", date }),
          JSON.stringify({ shiftCode: "C", reliefId, date, startTime, endTime }),
          now
        );
    })();

    return NextResponse.json({ success: true });
  }

  if (action === "mark_absent") {
    const { employeeId, date, supervisorId, reason } = body as {
      employeeId: number;
      date: string;
      supervisorId: number;
      reason: string;
    };

    // Validate current code is D or N
    const current = sqlite
      .prepare("SELECT shift_code FROM schedules WHERE employee_id = ? AND date = ?")
      .get(employeeId, date) as { shift_code: string } | undefined;

    if (!current || (current.shift_code !== "D" && current.shift_code !== "N")) {
      return NextResponse.json({ error: "Can only mark D or N shifts as absent" }, { status: 400 });
    }

    const shiftLabel = current.shift_code === "D" ? "day" : "night";

    sqlite.transaction(() => {
      sqlite
        .prepare(
          `UPDATE schedules SET shift_code = 'X', start_time = NULL, end_time = NULL, is_modified = 1, modified_by = ?, notes = ? WHERE employee_id = ? AND date = ?`
        )
        .run(supervisorId, reason, employeeId, date);

      sqlite
        .prepare(
          `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
           VALUES (?, 'schedule_change', 'Shift Marked Absent', ?, 0, ?, '/dashboard/schedule')`
        )
        .run(employeeId, `Your ${shiftLabel} shift on ${date} has been marked as absent: ${reason}`, now);

      sqlite
        .prepare(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, 'shift_marked_absent', 'schedule', ?, ?, ?, ?)`
        )
        .run(
          supervisorId,
          employeeId,
          JSON.stringify({ shiftCode: current.shift_code, date }),
          JSON.stringify({ shiftCode: "X", reason, date }),
          now
        );
    })();

    return NextResponse.json({ success: true });
  }

  if (action === "swap_shift") {
    const { employeeId, date, supervisorId, newShiftCode } = body as {
      employeeId: number;
      date: string;
      supervisorId: number;
      newShiftCode: string;
    };

    if (newShiftCode !== "D" && newShiftCode !== "N") {
      return NextResponse.json({ error: "newShiftCode must be D or N" }, { status: 400 });
    }

    const current = sqlite
      .prepare("SELECT shift_code FROM schedules WHERE employee_id = ? AND date = ?")
      .get(employeeId, date) as { shift_code: string } | undefined;

    if (!current || (current.shift_code !== "D" && current.shift_code !== "N")) {
      return NextResponse.json({ error: "Can only swap D or N shifts" }, { status: 400 });
    }

    if (current.shift_code === newShiftCode) {
      return NextResponse.json({ error: "Shift is already " + newShiftCode }, { status: 400 });
    }

    const newTimes = newShiftCode === "D"
      ? { start: "06:00", end: "18:00" }
      : { start: "18:00", end: "06:00" };

    const oldLabel = current.shift_code === "D" ? "Day" : "Night";
    const newLabel = newShiftCode === "D" ? "Day" : "Night";

    sqlite.transaction(() => {
      sqlite
        .prepare(
          `UPDATE schedules SET shift_code = ?, start_time = ?, end_time = ?, is_modified = 1, modified_by = ? WHERE employee_id = ? AND date = ?`
        )
        .run(newShiftCode, newTimes.start, newTimes.end, supervisorId, employeeId, date);

      sqlite
        .prepare(
          `INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
           VALUES (?, 'schedule_change', 'Shift Swapped', ?, 0, ?, '/dashboard/schedule')`
        )
        .run(employeeId, `Your shift on ${date} changed from ${oldLabel} to ${newLabel}`, now);

      sqlite
        .prepare(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, 'shift_swapped', 'schedule', ?, ?, ?, ?)`
        )
        .run(
          supervisorId,
          employeeId,
          JSON.stringify({ shiftCode: current.shift_code, date }),
          JSON.stringify({ shiftCode: newShiftCode, date }),
          now
        );
    })();

    return NextResponse.json({ success: true });
  }

  if (action === "add_note") {
    const { employeeId, date, supervisorId, note } = body as {
      employeeId: number;
      date: string;
      supervisorId: number;
      note: string;
    };

    sqlite.transaction(() => {
      sqlite
        .prepare(
          `UPDATE schedules SET notes = ?, is_modified = 1, modified_by = ? WHERE employee_id = ? AND date = ?`
        )
        .run(note, supervisorId, employeeId, date);

      sqlite
        .prepare(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, 'note_added', 'schedule', ?, ?, ?, ?)`
        )
        .run(
          supervisorId,
          employeeId,
          JSON.stringify({ date }),
          JSON.stringify({ note, date }),
          now
        );
    })();

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
