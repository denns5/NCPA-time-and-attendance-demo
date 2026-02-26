export type PayCode =
  | "REG"
  | "OT_1_5"
  | "OT_2_0"
  | "VAC"
  | "SICK"
  | "FLOAT"
  | "HOL"
  | "COMP"
  | "LBA"
  | "TRAIN"
  | "JURY"
  | "BEREAVEMENT"
  | "ADMIN"
  | "LWOP"
  | "FAM_SICK";

export const PAY_CODE_LABELS: Record<PayCode, string> = {
  REG: "Regular",
  OT_1_5: "Overtime 1.5×",
  OT_2_0: "Overtime 2.0×",
  VAC: "Vacation",
  SICK: "Sick",
  FLOAT: "Float Holiday",
  HOL: "Holiday",
  COMP: "Comp Time",
  LBA: "Leave Bank (LBA)",
  TRAIN: "Training",
  JURY: "Jury Duty",
  BEREAVEMENT: "Bereavement",
  ADMIN: "Admin Leave",
  LWOP: "Leave Without Pay",
  FAM_SICK: "Family Sick",
};

/** Pay codes that can be added by the employee as leave rows */
export const ADDABLE_LEAVE_CODES: PayCode[] = [
  "VAC",
  "SICK",
  "FAM_SICK",
  "FLOAT",
  "COMP",
  "LBA",
  "BEREAVEMENT",
  "ADMIN",
  "JURY",
  "LWOP",
];

/** Pay codes that require a note before submission */
export const CODES_REQUIRING_NOTES: PayCode[] = ["FAM_SICK", "LWOP"];

/** Map leave balance types to pay codes */
export const BALANCE_TO_PAY_CODE: Record<string, PayCode> = {
  vacation: "VAC",
  sick: "SICK",
  float: "FLOAT",
  comp: "COMP",
  lba: "LBA",
  holiday_bank: "HOL",
};

export const PAY_CODE_TO_BALANCE: Partial<Record<PayCode, string>> = {
  VAC: "vacation",
  SICK: "sick",
  FAM_SICK: "sick", // draws from sick balance
  FLOAT: "float",
  COMP: "comp",
  LBA: "lba",
};

export type TimesheetStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "processed"
  | "new";

export interface ScheduleEntry {
  id: number;
  employeeId: number;
  date: string;
  shiftCode: string;
  startTime: string | null;
  endTime: string | null;
  isModified: boolean;
  modifiedBy: number | null;
  notes: string | null;
}

export interface TimesheetRow {
  payCode: PayCode;
  hours: Record<string, number>; // date -> hours
  notes: Record<string, string>; // date -> note
  projectCode: string;
  costCode: string;
  isAutoPopulated: Record<string, boolean>; // date -> bool
  isAutoCalculated: boolean; // entire row is auto-calc (OT rows)
}

export interface LeaveBalance {
  leaveType: string;
  balanceHours: number;
  capHours: number | null;
}

export interface EmployeeInfo {
  id: number;
  name: string;
  employeeType: string;
  scheduleType: string;
  location: string;
  department: string;
  jobClassification: string;
}

export interface PayPeriod {
  start: string;
  end: string;
  label: string;
}

export interface TimesheetData {
  employee: EmployeeInfo;
  schedule: ScheduleEntry[];
  timesheet: {
    id: number;
    status: TimesheetStatus;
    submittedAt: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
  } | null;
  timeEntries: Array<{
    id: number;
    date: string;
    payCode: string;
    hours: number;
    projectCode: string | null;
    costCode: string | null;
    notes: string | null;
    isAutoCalculated: boolean;
  }>;
  leaveBalances: LeaveBalance[];
  payPeriods: PayPeriod[];
  currentPayPeriod: { start: string; end: string };
}

/**
 * Get the scheduled regular hours for a given schedule type and shift code.
 */
export function scheduledHoursForShift(
  scheduleType: string,
  shiftCode: string,
  isShortFriday?: boolean
): number {
  if (shiftCode === "R" || shiftCode === "OFF" || shiftCode === "X") return 0;
  if (shiftCode === "H") {
    // Holiday — use scheduled day length
    switch (scheduleType) {
      case "12_hour_rotating":
        return 12;
      case "4_10":
        return 10;
      case "9_80":
        return isShortFriday ? 8 : 9;
      default:
        return 8;
    }
  }
  // D, N, C shifts
  switch (scheduleType) {
    case "12_hour_rotating":
      return 12;
    case "4_10":
      return 10;
    case "9_80":
      return isShortFriday ? 8 : 9;
    case "8_80":
    default:
      return 8;
  }
}
