import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { employees, schedules, timesheets, leaveRequests } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const DEMO_TODAY = "2024-07-15";
const CURRENT_PP_START = "2024-07-15";
const CURRENT_PP_END = "2024-07-28";

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
    return NextResponse.json({ team: [], stats: { onShift: 0, pendingApprovals: 0, coverageGaps: 0, teamSize: 0 }, todaySchedules: [], pendingLeave: [], coverageGaps: [] });
  }

  // Today's schedule for each team member
  const todaySchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        inArray(schedules.employeeId, teamIds),
        eq(schedules.date, DEMO_TODAY)
      )
    );

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

  // Current period timesheets
  const currentTimesheets = await db
    .select()
    .from(timesheets)
    .where(
      and(
        inArray(timesheets.employeeId, teamIds),
        eq(timesheets.payPeriodStart, CURRENT_PP_START),
        eq(timesheets.payPeriodEnd, CURRENT_PP_END)
      )
    );

  // Coverage gaps: X codes in the next 14 days
  const allSchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        inArray(schedules.employeeId, teamIds),
        eq(schedules.shiftCode, "X")
      )
    );

  const coverageGaps = allSchedules.filter((s) => s.date >= DEMO_TODAY);

  // Build team roster
  const team = teamMembers.map((emp) => {
    const todaySched = todaySchedules.find((s) => s.employeeId === emp.id);
    const ts = currentTimesheets.find((t) => t.employeeId === emp.id);
    return {
      id: emp.id,
      name: emp.name,
      employeeType: emp.employeeType,
      scheduleType: emp.scheduleType,
      location: emp.location,
      jobClassification: emp.jobClassification,
      todayShift: todaySched?.shiftCode || "—",
      todayStart: todaySched?.startTime || null,
      todayEnd: todaySched?.endTime || null,
      timesheetStatus: ts?.status || "not_started",
    };
  });

  // Count on-shift (D or N or C today)
  const onShift = todaySchedules.filter((s) =>
    ["D", "N", "C"].includes(s.shiftCode)
  ).length;

  // Pending approval count = submitted timesheets + pending leave
  const submittedTimesheets = currentTimesheets.filter((t) => t.status === "submitted");
  const pendingApprovals = submittedTimesheets.length + pendingLeave.length;

  return NextResponse.json({
    team,
    stats: {
      onShift,
      pendingApprovals,
      coverageGaps: coverageGaps.length,
      teamSize: teamMembers.length,
    },
    pendingLeave: pendingLeave.map((lr) => ({
      id: lr.id,
      employeeId: lr.employeeId,
      employeeName: teamMembers.find((e) => e.id === lr.employeeId)?.name || "Unknown",
      leaveType: lr.leaveType,
      startDate: lr.startDate,
      endDate: lr.endDate,
      totalHours: lr.totalHours,
    })),
    coverageGaps: coverageGaps.map((g) => ({
      date: g.date,
      employeeId: g.employeeId,
      employeeName: teamMembers.find((e) => e.id === g.employeeId)?.name || "Unknown",
    })),
  });
}
