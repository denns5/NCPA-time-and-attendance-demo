import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  employees,
  schedules,
  timesheets,
  timeEntries,
  leaveBalances,
  leaveRequests,
  payRules,
  auditLog,
} from "@/db/schema";
import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";

const DEMO_TODAY = "2024-07-15";
const PAY_PERIOD_START = "2024-07-15";
const PAY_PERIOD_END = "2024-07-28";

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + (m || 0) / 60;
}

async function getEmployeeData(employeeId: number) {
  // Current timesheet status
  const currentTimesheet = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.employeeId, employeeId),
        eq(timesheets.payPeriodStart, PAY_PERIOD_START)
      )
    )
    .then((rows) => rows[0] || null);

  // Next working shift
  const nextShifts = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.employeeId, employeeId),
        gte(schedules.date, DEMO_TODAY),
        inArray(schedules.shiftCode, ["D", "N", "C"])
      )
    )
    .then((rows) => rows.sort((a, b) => a.date.localeCompare(b.date)));
  const nextShift = nextShifts[0] || null;

  // Vacation balance
  const vacBalance = await db
    .select()
    .from(leaveBalances)
    .where(
      and(
        eq(leaveBalances.employeeId, employeeId),
        eq(leaveBalances.leaveType, "vacation")
      )
    )
    .then((rows) => rows[0] || null);

  // Pending leave requests
  const pendingLeave = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, employeeId),
        eq(leaveRequests.status, "pending")
      )
    );

  // Format timesheet status
  let timesheetValue = "No Timesheet";
  let timesheetDesc = `Pay period ${PAY_PERIOD_START.slice(5)} – ${PAY_PERIOD_END.slice(5)}`;
  if (currentTimesheet) {
    timesheetValue =
      currentTimesheet.status.charAt(0).toUpperCase() +
      currentTimesheet.status.slice(1);
    timesheetDesc = `Pay period ${currentTimesheet.payPeriodStart.slice(5)} – ${currentTimesheet.payPeriodEnd.slice(5)}`;
  }

  // Format next shift
  let shiftValue = "No Shifts";
  let shiftDesc = "No upcoming shifts scheduled";
  if (nextShift) {
    const shiftNames: Record<string, string> = {
      D: "Day Shift",
      N: "Night Shift",
      C: "Coverage",
    };
    shiftValue = shiftNames[nextShift.shiftCode] || nextShift.shiftCode;
    const isToday = nextShift.date === DEMO_TODAY;
    const dateLabel = isToday ? "Today" : nextShift.date.slice(5);
    const timeRange =
      nextShift.startTime && nextShift.endTime
        ? `, ${nextShift.startTime} – ${nextShift.endTime}`
        : "";
    shiftDesc = `${dateLabel}${timeRange}`;
  }

  // Format vacation balance
  const vacHours = vacBalance ? vacBalance.balanceHours : 0;
  const vacValue = `${vacHours} hrs`;

  // Format pending leave
  const pendingCount = pendingLeave.length;
  let pendingDesc = "No pending requests";
  if (pendingCount > 0) {
    const first = pendingLeave[0];
    pendingDesc = `${first.leaveType} ${first.startDate.slice(5)} – ${first.endDate.slice(5)}`;
  }

  return {
    timesheet: { value: timesheetValue, description: timesheetDesc },
    nextShift: { value: shiftValue, description: shiftDesc },
    leaveBalance: { value: vacValue, description: "Vacation available" },
    pendingRequests: {
      value: String(pendingCount),
      description: pendingDesc,
    },
  };
}

async function getSupervisorData(supervisorId: number) {
  // Get team member IDs
  const teamMembers = await db
    .select()
    .from(employees)
    .where(eq(employees.supervisorId, supervisorId));
  const teamIds = teamMembers.map((e) => e.id);

  if (teamIds.length === 0) {
    return {
      pendingApprovals: { value: "0", description: "No team members" },
      teamOnShift: { value: "0", description: "No team members" },
      coverageGaps: { value: "0", description: "No gaps" },
      otThisPeriod: { value: "0 hrs", description: "No overtime" },
    };
  }

  // Pending approvals: submitted timesheets + pending leave
  const submittedTimesheets = await db
    .select()
    .from(timesheets)
    .where(
      and(
        inArray(timesheets.employeeId, teamIds),
        eq(timesheets.status, "submitted")
      )
    );

  const pendingLeave = await db
    .select()
    .from(leaveRequests)
    .where(
      and(
        inArray(leaveRequests.employeeId, teamIds),
        eq(leaveRequests.status, "pending")
      )
    );

  const tsCount = submittedTimesheets.length;
  const leaveCount = pendingLeave.length;
  const totalApprovals = tsCount + leaveCount;
  const parts: string[] = [];
  if (tsCount > 0) parts.push(`${tsCount} timesheet${tsCount > 1 ? "s" : ""}`);
  if (leaveCount > 0)
    parts.push(`${leaveCount} leave request${leaveCount > 1 ? "s" : ""}`);

  // Team on shift today
  const todaySchedules = await db
    .select()
    .from(schedules)
    .where(
      and(
        inArray(schedules.employeeId, teamIds),
        eq(schedules.date, DEMO_TODAY),
        inArray(schedules.shiftCode, ["D", "N", "C"])
      )
    );

  const dayCount = todaySchedules.filter(
    (s) => s.shiftCode === "D" || (s.shiftCode === "C" && s.startTime && parseTime(s.startTime) < 18)
  ).length;
  const nightCount = todaySchedules.filter(
    (s) => s.shiftCode === "N" || (s.shiftCode === "C" && s.startTime && parseTime(s.startTime) >= 18)
  ).length;
  let shiftDesc = "";
  if (dayCount > 0 && nightCount > 0)
    shiftDesc = `${dayCount} day, ${nightCount} night`;
  else if (dayCount > 0) shiftDesc = `Day shift`;
  else if (nightCount > 0) shiftDesc = `Night shift`;
  else shiftDesc = "No shifts today";

  // Coverage gaps
  const coverageGaps = await db
    .select()
    .from(schedules)
    .where(
      and(
        inArray(schedules.employeeId, teamIds),
        eq(schedules.shiftCode, "X"),
        gte(schedules.date, DEMO_TODAY)
      )
    );
  let gapDesc = "No gaps";
  if (coverageGaps.length > 0) {
    const sorted = coverageGaps.sort((a, b) => a.date.localeCompare(b.date));
    gapDesc = `Next: ${sorted[0].date.slice(5)}`;
  }

  // OT this period
  const periodTimesheets = await db
    .select()
    .from(timesheets)
    .where(
      and(
        inArray(timesheets.employeeId, teamIds),
        eq(timesheets.payPeriodStart, PAY_PERIOD_START),
        eq(timesheets.payPeriodEnd, PAY_PERIOD_END)
      )
    );
  const tsIds = periodTimesheets.map((t) => t.id);

  let otHours = 0;
  let topOtName = "";
  if (tsIds.length > 0) {
    const otEntries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          inArray(timeEntries.timesheetId, tsIds),
          inArray(timeEntries.payCode, ["OT_1_5", "OT_2_0"])
        )
      );
    // Tally per employee for description
    const otByTs: Record<number, number> = {};
    for (const e of otEntries) {
      otByTs[e.timesheetId] = (otByTs[e.timesheetId] || 0) + e.hours;
      otHours += e.hours;
    }
    // Find top OT employee
    let maxOt = 0;
    let maxTsId = 0;
    for (const [tid, h] of Object.entries(otByTs)) {
      if (h > maxOt) {
        maxOt = h;
        maxTsId = Number(tid);
      }
    }
    if (maxTsId) {
      const ts = periodTimesheets.find((t) => t.id === maxTsId);
      if (ts) {
        const emp = teamMembers.find((e) => e.id === ts.employeeId);
        if (emp) topOtName = emp.name;
      }
    }
  }
  const otValue = `${Math.round(otHours * 10) / 10} hrs`;
  const otDesc = topOtName ? `Top: ${topOtName}` : "No overtime recorded";

  return {
    pendingApprovals: {
      value: String(totalApprovals),
      description: parts.join(", ") || "All caught up",
    },
    teamOnShift: {
      value: String(todaySchedules.length),
      description: shiftDesc,
    },
    coverageGaps: {
      value: String(coverageGaps.length),
      description: gapDesc,
    },
    otThisPeriod: { value: otValue, description: otDesc },
  };
}

async function getPayrollAdminData() {
  // Pay period status: count timesheets by status for current period
  const periodTimesheets = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.payPeriodStart, PAY_PERIOD_START),
        eq(timesheets.payPeriodEnd, PAY_PERIOD_END)
      )
    );

  const statusCounts: Record<string, number> = {};
  for (const ts of periodTimesheets) {
    statusCounts[ts.status] = (statusCounts[ts.status] || 0) + 1;
  }
  const hasOpen =
    (statusCounts["draft"] || 0) > 0 || (statusCounts["submitted"] || 0) > 0;
  const ppStatusValue = hasOpen ? "Open" : periodTimesheets.length === 0 ? "No Timesheets" : "Ready";
  const pendingCount =
    (statusCounts["draft"] || 0) + (statusCounts["submitted"] || 0);
  const ppDesc =
    periodTimesheets.length > 0
      ? `${PAY_PERIOD_START.slice(5)} – ${PAY_PERIOD_END.slice(5)} — ${pendingCount} pending`
      : `${PAY_PERIOD_START.slice(5)} – ${PAY_PERIOD_END.slice(5)}`;

  // Compliance alerts — run the 6 checks, count at check level (not instance level)
  // to match what the compliance page shows
  const allEmployees = await db.select().from(employees);
  const julySchedules = await db
    .select()
    .from(schedules)
    .where(and(gte(schedules.date, "2024-07-01"), lte(schedules.date, "2024-07-31")));
  const allTimesheets = await db.select().from(timesheets);
  const allEntries = await db.select().from(timeEntries);

  let warnings = 0;
  let violations = 0;

  // 1. Daily OT Threshold → warning if any
  let dailyOtCount = 0;
  for (const emp of allEmployees) {
    for (const sched of julySchedules.filter((s) => s.employeeId === emp.id)) {
      if (sched.startTime && sched.endTime) {
        const start = parseTime(sched.startTime);
        const end = parseTime(sched.endTime);
        let hours = end - start;
        if (hours < 0) hours += 24;
        const threshold =
          emp.scheduleType === "12_hour_rotating" ? 12
            : emp.scheduleType === "4_10" ? 10
            : emp.scheduleType === "9_80" ? 9 : 8;
        if (hours > threshold) dailyOtCount++;
      }
    }
  }
  if (dailyOtCount > 0) warnings++;

  // 2. Rest Period (8hr min) → violation if >2, warning if 1-2
  let restCount = 0;
  for (const emp of allEmployees) {
    const empScheds = julySchedules
      .filter((s) => s.employeeId === emp.id && s.startTime && s.endTime)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < empScheds.length - 1; i++) {
      const current = empScheds[i];
      const next = empScheds[i + 1];
      if (!current.endTime || !next.startTime) continue;
      const currDate = new Date(current.date + "T12:00:00");
      const nextDate = new Date(next.date + "T12:00:00");
      const dayDiff = (nextDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff !== 1) continue;
      const endHour = parseTime(current.endTime);
      const startHour = parseTime(next.startTime);
      let restHours = startHour + 24 - endHour;
      if (restHours >= 24) restHours -= 24;
      if (restHours < 8) restCount++;
    }
  }
  if (restCount > 2) violations++;
  else if (restCount > 0) warnings++;

  // 3. Minimum Staffing at Lodi → violation if any
  const lodiIds = new Set(allEmployees.filter((e) => e.location === "lodi").map((e) => e.id));
  let staffingCount = 0;
  for (let d = 1; d <= 31; d++) {
    const dateStr = `2024-07-${String(d).padStart(2, "0")}`;
    const dayScheds = julySchedules.filter(
      (s) => s.date === dateStr && lodiIds.has(s.employeeId)
    );
    const dayShift = dayScheds.filter(
      (s) => s.shiftCode === "D" || (s.shiftCode === "C" && s.startTime && parseTime(s.startTime) < 18)
    );
    const nightShift = dayScheds.filter(
      (s) => s.shiftCode === "N" || (s.shiftCode === "C" && s.startTime && parseTime(s.startTime) >= 18)
    );
    if (dayShift.length > 0 && dayShift.length < 2) staffingCount++;
    if (nightShift.length > 0 && nightShift.length < 2) staffingCount++;
  }
  if (staffingCount > 0) violations++;

  // 4. FLSA Work Period → violation if any
  const ibewEmployees = allEmployees.filter((e) => e.employeeType === "ibew_1245");
  let flsaCount = 0;
  for (const emp of ibewEmployees) {
    const empTs = allTimesheets.filter((t) => t.employeeId === emp.id);
    let totalHours = 0;
    for (const ts of empTs) {
      const entries = allEntries.filter(
        (e) => e.timesheetId === ts.id && e.date >= "2024-07-01" && e.date <= "2024-07-28"
      );
      totalHours += entries.reduce((sum, e) => sum + e.hours, 0);
    }
    if (totalHours > 212) flsaCount++;
  }
  if (flsaCount > 0) violations++;

  // 5. CA Meal/Rest → warning if any
  let mealCount = 0;
  for (const emp of allEmployees) {
    for (const sched of julySchedules.filter((s) => s.employeeId === emp.id && s.startTime && s.endTime)) {
      const start = parseTime(sched.startTime!);
      const end = parseTime(sched.endTime!);
      let hours = end - start;
      if (hours < 0) hours += 24;
      if (hours > 10 && emp.scheduleType !== "12_hour_rotating") mealCount++;
    }
  }
  if (mealCount > 0) warnings++;

  // 6. Open Coverage Needs → warning if any
  const openCoverage = julySchedules.filter(
    (s) => s.shiftCode === "X" && s.date >= DEMO_TODAY
  );
  if (openCoverage.length > 0) warnings++;

  const totalAlerts = warnings + violations;
  const alertDesc =
    totalAlerts === 0
      ? "All checks passing"
      : `${warnings} warning${warnings !== 1 ? "s" : ""}, ${violations} violation${violations !== 1 ? "s" : ""}`;

  // Active pay rules count
  const rules = await db.select().from(payRules).where(eq(payRules.isActive, true));
  const rulesCount = rules.length;

  // Last ADP export
  const lastExport = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.action, "adp_export"))
    .orderBy(desc(auditLog.createdAt))
    .then((rows) => rows[0] || null);

  let exportValue = "None";
  let exportDesc = "No exports yet";
  if (lastExport) {
    const exportDate = lastExport.createdAt.slice(0, 10);
    exportValue = exportDate;
    try {
      const details = JSON.parse(lastExport.newValue || "{}");
      exportDesc = `${details.exportedCount || 0} records exported`;
    } catch {
      exportDesc = "Export completed";
    }
  }

  return {
    payPeriodStatus: { value: ppStatusValue, description: ppDesc },
    complianceAlerts: { value: String(totalAlerts), description: alertDesc },
    activePayRules: {
      value: String(rulesCount),
      description: "All rules active",
    },
    lastAdpExport: { value: exportValue, description: exportDesc },
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const employeeId = Number(searchParams.get("employeeId") || "0");

  if (!role) {
    return NextResponse.json({ error: "role required" }, { status: 400 });
  }

  switch (role) {
    case "employee":
      return NextResponse.json(await getEmployeeData(employeeId));
    case "supervisor":
      return NextResponse.json(await getSupervisorData(employeeId));
    case "payroll_admin":
      return NextResponse.json(await getPayrollAdminData());
    default:
      return NextResponse.json({ error: "Unknown role" }, { status: 400 });
  }
}
