import { EmployeeInfo } from "./timesheet-types";

export type { EmployeeInfo };

export type LeaveType = "vacation" | "sick" | "float" | "lba" | "holiday_bank" | "comp";

export interface LeaveBalanceDetail {
  leaveType: LeaveType;
  balanceHours: number;
  accrualRatePerPeriod: number;
  capHours: number | null;
  boyBalance: number;
  ytdAccrued: number;
  ytdUsed: number;
  projectedBalance: number;
  percentOfCap: number | null;
}

export interface LeaveRequest {
  id: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalHours: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  submittedAt: string;
  decidedAt: string | null;
  decisionNotes: string | null;
}

export interface LeavePageData {
  employee: EmployeeInfo;
  balances: LeaveBalanceDetail[];
  requests: LeaveRequest[];
  schedule: Array<{ date: string; shiftCode: string }>;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick",
  float: "Float Holiday",
  lba: "Leave Bank (LBA)",
  holiday_bank: "Holiday Bank",
  comp: "Comp Time",
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, { bg: string; text: string; border: string; progress: string }> = {
  vacation: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", progress: "bg-blue-500" },
  sick: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", progress: "bg-red-500" },
  float: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", progress: "bg-amber-500" },
  lba: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", progress: "bg-purple-500" },
  holiday_bank: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", progress: "bg-emerald-500" },
  comp: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", progress: "bg-indigo-500" },
};

/** Leave types that only apply to shift workers (IBEW 12-hour) */
export const SHIFT_WORKER_ONLY_TYPES: LeaveType[] = ["lba", "holiday_bank"];

/** Default hours per day by schedule type */
export function defaultHoursPerDay(scheduleType: string): number {
  switch (scheduleType) {
    case "12_hour_rotating": return 12;
    case "4_10": return 10;
    case "9_80": return 9;
    case "8_80": default: return 8;
  }
}

/** Whether an employee is a shift worker (works weekends) */
export function isShiftWorker(scheduleType: string): boolean {
  return scheduleType === "12_hour_rotating";
}
