import {
  TimesheetData,
  TimesheetRow,
  PayCode,
  scheduledHoursForShift,
} from "./timesheet-types";
import { calculateOvertime, ScheduleType, DayHours } from "./overtime";

/**
 * Build timesheet rows from API data.
 *
 * If a timesheet already exists with entries, rebuild from those.
 * Otherwise, auto-populate from the schedule.
 */
export function buildRowsFromData(data: TimesheetData): TimesheetRow[] {
  const dates = getDatesForPeriod(
    data.currentPayPeriod.start,
    data.currentPayPeriod.end
  );
  const scheduleType = data.employee.scheduleType as ScheduleType;
  const scheduleMap = new Map(data.schedule.map((s) => [s.date, s]));

  if (data.timeEntries.length > 0) {
    return rebuildFromEntries(data, dates);
  }

  return autoPopulateFromSchedule(dates, scheduleType, scheduleMap);
}

function getDatesForPeriod(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function autoPopulateFromSchedule(
  dates: string[],
  scheduleType: ScheduleType,
  scheduleMap: Map<string, { shiftCode: string; date: string }>
): TimesheetRow[] {
  const regHours: Record<string, number> = {};
  const holHours: Record<string, number> = {};
  const regAutoPopulated: Record<string, boolean> = {};
  const holAutoPopulated: Record<string, boolean> = {};
  let hasHoliday = false;

  for (const date of dates) {
    const sched = scheduleMap.get(date);
    const shiftCode = sched?.shiftCode || "OFF";
    const dow = new Date(date + "T12:00:00").getDay();
    const isShortFriday = scheduleType === "9_80" && dow === 5;

    if (shiftCode === "H") {
      holHours[date] = scheduledHoursForShift(scheduleType, "H", isShortFriday);
      holAutoPopulated[date] = true;
      regHours[date] = 0;
      hasHoliday = true;
    } else if (
      shiftCode === "D" ||
      shiftCode === "N" ||
      shiftCode === "C"
    ) {
      regHours[date] = scheduledHoursForShift(scheduleType, shiftCode, isShortFriday);
      regAutoPopulated[date] = true;
      holHours[date] = 0;
    } else {
      regHours[date] = 0;
      holHours[date] = 0;
    }
  }

  const rows: TimesheetRow[] = [
    {
      payCode: "REG",
      hours: regHours,
      notes: {},
      projectCode: "",
      costCode: "",
      isAutoPopulated: regAutoPopulated,
      isAutoCalculated: false,
    },
  ];

  if (hasHoliday) {
    rows.push({
      payCode: "HOL",
      hours: holHours,
      notes: {},
      projectCode: "",
      costCode: "",
      isAutoPopulated: holAutoPopulated,
      isAutoCalculated: false,
    });
  }

  // Calculate OT
  return applyOTCalculation(rows, dates, scheduleType);
}

function rebuildFromEntries(
  data: TimesheetData,
  dates: string[]
): TimesheetRow[] {
  const scheduleType = data.employee.scheduleType as ScheduleType;
  const scheduleMap = new Map(data.schedule.map((s) => [s.date, s]));

  // Group entries by payCode
  const byCode = new Map<string, typeof data.timeEntries>();
  for (const entry of data.timeEntries) {
    const existing = byCode.get(entry.payCode) || [];
    existing.push(entry);
    byCode.set(entry.payCode, existing);
  }

  const rows: TimesheetRow[] = [];

  // Always have REG first, then HOL, then other codes, then OT last
  const order: string[] = ["REG", "HOL"];
  for (const code of Array.from(byCode.keys())) {
    if (!order.includes(code) && code !== "OT_1_5" && code !== "OT_2_0") {
      order.push(code);
    }
  }

  for (const code of order) {
    const entries = byCode.get(code);
    if (!entries) {
      if (code === "REG") {
        // Always show REG row
        rows.push(makeEmptyRow("REG" as PayCode, dates));
      }
      continue;
    }

    const hours: Record<string, number> = {};
    const notes: Record<string, string> = {};
    const isAutoPopulated: Record<string, boolean> = {};
    let projectCode = "";
    let costCode = "";

    for (const date of dates) {
      hours[date] = 0;
    }

    for (const entry of entries) {
      hours[entry.date] = entry.hours;
      if (entry.notes) notes[entry.date] = entry.notes;
      if (entry.projectCode) projectCode = entry.projectCode;
      if (entry.costCode) costCode = entry.costCode;

      // Mark as auto-populated if from schedule
      const sched = scheduleMap.get(entry.date);
      if (sched && entry.isAutoCalculated) {
        isAutoPopulated[entry.date] = true;
      }
    }

    rows.push({
      payCode: code as PayCode,
      hours,
      notes,
      projectCode,
      costCode,
      isAutoPopulated,
      isAutoCalculated: code === "OT_1_5" || code === "OT_2_0",
    });
  }

  // Recalculate OT
  return applyOTCalculation(
    rows.filter((r) => r.payCode !== "OT_1_5" && r.payCode !== "OT_2_0"),
    dates,
    scheduleType
  );
}

function makeEmptyRow(payCode: PayCode, dates: string[]): TimesheetRow {
  return {
    payCode,
    hours: Object.fromEntries(dates.map((d) => [d, 0])),
    notes: {},
    projectCode: "",
    costCode: "",
    isAutoPopulated: {},
    isAutoCalculated: false,
  };
}

function applyOTCalculation(
  rows: TimesheetRow[],
  dates: string[],
  scheduleType: ScheduleType
): TimesheetRow[] {
  // Sum worked hours per day
  const dayHours: DayHours[] = dates.map((date) => {
    let total = 0;
    for (const row of rows) {
      if (row.payCode === "REG") {
        total += row.hours[date] || 0;
      }
    }
    const dow = new Date(date + "T12:00:00").getDay();
    const isShortFriday = scheduleType === "9_80" && dow === 5;
    return { date, regular: total, isShortFriday };
  });

  const otResults = calculateOvertime(scheduleType, dayHours);

  const ot15Hours: Record<string, number> = {};
  const ot20Hours: Record<string, number> = {};
  let hasOT15 = false;
  let hasOT20 = false;

  for (const r of otResults) {
    if (r.ot15 > 0) {
      ot15Hours[r.date] = r.ot15;
      hasOT15 = true;
    }
    if (r.ot20 > 0) {
      ot20Hours[r.date] = r.ot20;
      hasOT20 = true;
    }
  }

  // Adjust REG hours — subtract OT
  const adjusted = rows.map((row) => {
    if (row.payCode !== "REG") return row;
    const newHours = { ...row.hours };
    for (const date of dates) {
      const worked = dayHours.find((d) => d.date === date)?.regular || 0;
      const ot15 = ot15Hours[date] || 0;
      const ot20 = ot20Hours[date] || 0;
      if (worked > 0 && (ot15 > 0 || ot20 > 0)) {
        newHours[date] = Math.max(0, worked - ot15 - ot20);
      }
    }
    return { ...row, hours: newHours };
  });

  if (hasOT15) {
    adjusted.push({
      payCode: "OT_1_5",
      hours: Object.fromEntries(dates.map((d) => [d, ot15Hours[d] || 0])),
      notes: {},
      projectCode: "",
      costCode: "",
      isAutoPopulated: {},
      isAutoCalculated: true,
    });
  }

  if (hasOT20) {
    adjusted.push({
      payCode: "OT_2_0",
      hours: Object.fromEntries(dates.map((d) => [d, ot20Hours[d] || 0])),
      notes: {},
      projectCode: "",
      costCode: "",
      isAutoPopulated: {},
      isAutoCalculated: true,
    });
  }

  return adjusted;
}
