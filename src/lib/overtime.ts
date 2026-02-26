/**
 * Overtime auto-calculation engine for NCPA Time & Attendance.
 *
 * Schedule-type rules (no pyramiding — highest applicable rate wins):
 *   8/80:  daily >8 = 1.5×, daily >12 = 2×, weekly >40 = 1.5×
 *   9/80:  long-day >9 = 1.5×, short-day >8 = 1.5×, daily >12 = 2×
 *   4/10:  daily >10 = 1.5×, daily >12 = 2×, weekly >40 = 1.5×
 *   12-hr: daily >12 = 1.5×, daily >16 = 2×, weekly >40 = 1.5×
 */

export type ScheduleType = "8_80" | "9_80" | "4_10" | "12_hour_rotating";

export interface DayHours {
  date: string; // YYYY-MM-DD
  regular: number; // total non-OT worked hours entered for this day
  isShortFriday?: boolean; // for 9/80 — the alternate 8hr Friday
}

export interface OTResult {
  date: string;
  ot15: number;
  ot20: number;
}

/** Daily OT thresholds by schedule type */
function dailyThresholds(
  scheduleType: ScheduleType,
  isShortFriday: boolean
): { ot15Start: number; ot20Start: number } {
  switch (scheduleType) {
    case "8_80":
      return { ot15Start: 8, ot20Start: 12 };
    case "9_80":
      return { ot15Start: isShortFriday ? 8 : 9, ot20Start: 12 };
    case "4_10":
      return { ot15Start: 10, ot20Start: 12 };
    case "12_hour_rotating":
      return { ot15Start: 12, ot20Start: 16 };
  }
}

/**
 * Calculate OT for a 14-day pay period.
 *
 * Takes worked hours per day (REG + HOL-worked + leave that counts as worked,
 * basically whatever the employee actually clocked), and returns OT rows.
 *
 * Weekly OT uses a Sun-Sat workweek for non-shift workers.
 * For 12-hour rotating, the 28-day FLSA 7(k) exemption means weekly OT
 * is less relevant at the biweekly level — we still apply >40/week as a
 * simplified check consistent with the demo rules.
 */
export function calculateOvertime(
  scheduleType: ScheduleType,
  days: DayHours[]
): OTResult[] {
  const results: OTResult[] = [];

  // --- Pass 1: Daily OT ---
  const dailyOT: Record<string, { ot15: number; ot20: number }> = {};
  for (const day of days) {
    const { ot15Start, ot20Start } = dailyThresholds(
      scheduleType,
      !!day.isShortFriday
    );
    let ot15 = 0;
    let ot20 = 0;

    if (day.regular > ot20Start) {
      // Hours above ot20Start are double-time
      ot20 = day.regular - ot20Start;
      // Hours between ot15Start and ot20Start are time-and-a-half
      ot15 = ot20Start - ot15Start;
    } else if (day.regular > ot15Start) {
      ot15 = day.regular - ot15Start;
    }

    dailyOT[day.date] = { ot15, ot20 };
  }

  // --- Pass 2: Weekly OT (>40 hrs/week at 1.5×) ---
  // Split the 14 days into two workweeks (Sun-Sat).
  // We attribute weekly OT to the day that pushed it over.
  const weeklyOT: Record<string, number> = {};
  for (let week = 0; week < 2; week++) {
    const weekDays = days.slice(week * 7, (week + 1) * 7);
    let cumulative = 0;

    for (const day of weekDays) {
      // "worked" hours for weekly OT = regular hours minus any daily OT already counted
      const { ot15Start } = dailyThresholds(
        scheduleType,
        !!day.isShortFriday
      );
      // Hours that count toward the weekly 40-hour threshold are the lesser of
      // actual hours and the daily OT threshold (since hours above threshold
      // are already assigned to daily OT).
      const countableHours = Math.min(day.regular, ot15Start);
      cumulative += countableHours;

      if (cumulative > 40) {
        const excess = cumulative - 40;
        cumulative = 40; // cap it so we don't double-count
        weeklyOT[day.date] = (weeklyOT[day.date] || 0) + excess;
      }
    }
  }

  // --- Pass 3: Merge — no pyramiding ---
  // For each day, the OT is the MAX of daily OT and weekly OT.
  // Since daily OT is already broken into ot15/ot20, weekly OT only adds
  // ot15 hours that aren't already covered by daily OT.
  for (const day of days) {
    const d = dailyOT[day.date] || { ot15: 0, ot20: 0 };
    const w = weeklyOT[day.date] || 0;

    // Weekly OT is at 1.5× — only add the portion not already counted as daily OT
    const totalDailyOT = d.ot15 + d.ot20;
    const additionalWeeklyOT = Math.max(0, w - totalDailyOT);

    const ot15 = d.ot15 + additionalWeeklyOT;
    const ot20 = d.ot20;

    results.push({ date: day.date, ot15, ot20 });
  }

  return results;
}

/**
 * Given total hours for a day and a schedule type, return the regular
 * (non-OT) hours. This is used to adjust the REG row after OT calculation.
 */
export function regularHoursForDay(
  scheduleType: ScheduleType,
  totalHours: number,
  isShortFriday: boolean
): number {
  const { ot15Start } = dailyThresholds(scheduleType, isShortFriday);
  return Math.min(totalHours, ot15Start);
}
