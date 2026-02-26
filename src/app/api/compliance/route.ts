import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { employees, schedules, timesheets, timeEntries } from "@/db/schema";
import { and, gte, lte } from "drizzle-orm";

type ComplianceCheck = {
  name: string;
  category: string;
  status: "pass" | "warning" | "violation";
  count: number;
  details: Array<{ employee: string; date: string; description: string }>;
};

export async function GET() {
  const allEmployees = await db.select().from(employees);
  const julySchedules = await db
    .select()
    .from(schedules)
    .where(and(gte(schedules.date, "2024-07-01"), lte(schedules.date, "2024-07-31")));

  const allTimesheets = await db.select().from(timesheets);
  const allEntries = await db.select().from(timeEntries);

  const checks: ComplianceCheck[] = [];

  // 1. Daily OT Threshold Check
  const dailyOTDetails: ComplianceCheck["details"] = [];
  for (const emp of allEmployees) {
    const empSchedules = julySchedules.filter((s) => s.employeeId === emp.id);
    for (const sched of empSchedules) {
      if (sched.startTime && sched.endTime) {
        const start = parseTime(sched.startTime);
        const end = parseTime(sched.endTime);
        let hours = end - start;
        if (hours < 0) hours += 24; // overnight
        const threshold = emp.scheduleType === "12_hour_rotating" ? 12 : emp.scheduleType === "4_10" ? 10 : emp.scheduleType === "9_80" ? 9 : 8;
        if (hours > threshold) {
          dailyOTDetails.push({
            employee: emp.name,
            date: sched.date,
            description: `Scheduled ${hours}h, exceeds ${threshold}h daily threshold for ${emp.scheduleType} schedule`,
          });
        }
      }
    }
  }
  checks.push({
    name: "Daily Overtime Thresholds",
    category: "FLSA",
    status: dailyOTDetails.length === 0 ? "pass" : "warning",
    count: dailyOTDetails.length,
    details: dailyOTDetails,
  });

  // 2. Rest Period Between Shifts (8hr minimum)
  const restDetails: ComplianceCheck["details"] = [];
  for (const emp of allEmployees) {
    const empSchedules = julySchedules
      .filter((s) => s.employeeId === emp.id && s.startTime && s.endTime)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < empSchedules.length - 1; i++) {
      const current = empSchedules[i];
      const next = empSchedules[i + 1];
      if (!current.endTime || !next.startTime) continue;

      // Check consecutive days
      const currDate = new Date(current.date + "T12:00:00");
      const nextDate = new Date(next.date + "T12:00:00");
      const dayDiff = (nextDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff !== 1) continue;

      const endHour = parseTime(current.endTime);
      const startHour = parseTime(next.startTime);
      let restHours = startHour + 24 - endHour;
      if (restHours >= 24) restHours -= 24;

      if (restHours < 8) {
        restDetails.push({
          employee: emp.name,
          date: next.date,
          description: `Only ${restHours.toFixed(1)}h rest between shifts (${current.endTime} to ${next.startTime})`,
        });
      }
    }
  }
  checks.push({
    name: "Minimum Rest Period (8hr)",
    category: "California Labor",
    status: restDetails.length === 0 ? "pass" : restDetails.length > 2 ? "violation" : "warning",
    count: restDetails.length,
    details: restDetails,
  });

  // 3. Minimum Staffing at Lodi (2 operators per shift)
  const staffingDetails: ComplianceCheck["details"] = [];
  const lodiEmployees = allEmployees.filter((e) => e.location === "lodi");
  const lodiIds = new Set(lodiEmployees.map((e) => e.id));

  // Check each day in July
  for (let d = 1; d <= 31; d++) {
    const dateStr = `2024-07-${String(d).padStart(2, "0")}`;
    const daySchedules = julySchedules.filter(
      (s) => s.date === dateStr && lodiIds.has(s.employeeId)
    );

    const dayShift = daySchedules.filter((s) => s.shiftCode === "D" || (s.shiftCode === "C" && s.startTime && parseTime(s.startTime) < 18));
    const nightShift = daySchedules.filter((s) => s.shiftCode === "N" || (s.shiftCode === "C" && s.startTime && parseTime(s.startTime) >= 18));

    if (dayShift.length > 0 && dayShift.length < 2) {
      staffingDetails.push({
        employee: "Lodi Day Shift",
        date: dateStr,
        description: `Only ${dayShift.length} operator(s) on day shift (minimum 2 required)`,
      });
    }
    if (nightShift.length > 0 && nightShift.length < 2) {
      staffingDetails.push({
        employee: "Lodi Night Shift",
        date: dateStr,
        description: `Only ${nightShift.length} operator(s) on night shift (minimum 2 required)`,
      });
    }
  }
  checks.push({
    name: "Minimum Staffing — Lodi (2/shift)",
    category: "Operational",
    status: staffingDetails.length === 0 ? "pass" : "violation",
    count: staffingDetails.length,
    details: staffingDetails,
  });

  // 4. FLSA Work Period Compliance
  const flsaDetails: ComplianceCheck["details"] = [];
  // For IBEW: 28-day FLSA period, threshold is 212 hours (7(k) exemption)
  const ibewEmployees = allEmployees.filter((e) => e.employeeType === "ibew_1245");
  for (const emp of ibewEmployees) {
    // Sum time entries for the period Jul 1-28
    const empTimesheets = allTimesheets.filter((t) => t.employeeId === emp.id);
    let totalHours = 0;
    for (const ts of empTimesheets) {
      const entries = allEntries.filter(
        (e) => e.timesheetId === ts.id && e.date >= "2024-07-01" && e.date <= "2024-07-28"
      );
      totalHours += entries.reduce((sum, e) => sum + e.hours, 0);
    }
    if (totalHours > 212) {
      flsaDetails.push({
        employee: emp.name,
        date: "2024-07-01 to 2024-07-28",
        description: `${totalHours}h in 28-day FLSA period exceeds 212h threshold`,
      });
    }
  }
  checks.push({
    name: "FLSA Work Period (28-day IBEW / 7-day HEA)",
    category: "FLSA",
    status: flsaDetails.length === 0 ? "pass" : "violation",
    count: flsaDetails.length,
    details: flsaDetails,
  });

  // 5. Meal/Rest Period (California)
  const mealDetails: ComplianceCheck["details"] = [];
  for (const emp of allEmployees) {
    const empSchedules = julySchedules.filter(
      (s) => s.employeeId === emp.id && s.startTime && s.endTime
    );
    for (const sched of empSchedules) {
      const start = parseTime(sched.startTime!);
      const end = parseTime(sched.endTime!);
      let hours = end - start;
      if (hours < 0) hours += 24;
      // CA: meal break required for shifts > 5 hours
      if (hours > 5 && emp.scheduleType !== "12_hour_rotating") {
        // For demo, we flag shifts > 10h as potential concern (no break data)
        if (hours > 10) {
          mealDetails.push({
            employee: emp.name,
            date: sched.date,
            description: `${hours}h shift — verify meal/rest breaks provided per CA Labor Code`,
          });
        }
      }
    }
  }
  checks.push({
    name: "CA Meal/Rest Period Compliance",
    category: "California Labor",
    status: mealDetails.length === 0 ? "pass" : "warning",
    count: mealDetails.length,
    details: mealDetails,
  });

  // 6. Open Coverage Needs
  const openCoverage = julySchedules.filter(
    (s) => s.shiftCode === "X" && s.date >= "2024-07-15"
  );
  const coverageDetails = openCoverage.map((s) => {
    const emp = allEmployees.find((e) => e.id === s.employeeId);
    return {
      employee: emp?.name || "Unknown",
      date: s.date,
      description: "Shift marked as X — needs coverage assignment",
    };
  });
  checks.push({
    name: "Open Coverage Needs",
    category: "Operational",
    status: coverageDetails.length === 0 ? "pass" : "warning",
    count: coverageDetails.length,
    details: coverageDetails,
  });

  // Summary
  const passed = checks.filter((c) => c.status === "pass").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const violations = checks.filter((c) => c.status === "violation").length;

  return NextResponse.json({
    checks,
    summary: { passed, warnings, violations, total: checks.length },
  });
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h + (m || 0) / 60;
}
