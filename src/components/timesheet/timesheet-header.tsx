"use client";

import { Badge } from "@/components/ui/badge";
import {
  EmployeeInfo,
  TimesheetStatus,
  PayPeriod,
} from "@/lib/timesheet-types";

const STATUS_STYLES: Record<
  TimesheetStatus,
  { label: string; className: string }
> = {
  new: { label: "New", className: "bg-slate-100 text-slate-700 border-slate-300" },
  draft: { label: "Draft", className: "bg-yellow-50 text-yellow-700 border-yellow-300" },
  submitted: { label: "Submitted", className: "bg-blue-50 text-blue-700 border-blue-300" },
  approved: { label: "Approved", className: "bg-green-50 text-green-700 border-green-300" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-300" },
  processed: { label: "Processed", className: "bg-purple-50 text-purple-700 border-purple-300" },
};

const SCHEDULE_LABELS: Record<string, string> = {
  "12_hour_rotating": "12-Hour Rotating",
  "9_80": "9/80 Compressed",
  "4_10": "4/10 Compressed",
  "8_80": "8/80 Standard",
};

interface TimesheetHeaderProps {
  employee: EmployeeInfo;
  status: TimesheetStatus;
  timesheet: {
    id: number;
    status: TimesheetStatus;
    submittedAt: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
  } | null;
  payPeriods: PayPeriod[];
  currentPayPeriod: { start: string; end: string };
  onPayPeriodChange: (start: string, end: string) => void;
}

export function TimesheetHeader({
  employee,
  status,
  timesheet,
  payPeriods,
  currentPayPeriod,
  onPayPeriodChange,
}: TimesheetHeaderProps) {
  const statusStyle = STATUS_STYLES[status];
  const ppValue = `${currentPayPeriod.start}|${currentPayPeriod.end}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Timesheet</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{employee.name}</span>
            <span>{employee.jobClassification}</span>
            <span>{SCHEDULE_LABELS[employee.scheduleType] || employee.scheduleType}</span>
            <span>{employee.department} &mdash; {employee.location.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={ppValue}
            onChange={(e) => {
              const [s, en] = e.target.value.split("|");
              onPayPeriodChange(s, en);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {payPeriods.map((pp) => (
              <option key={pp.start} value={`${pp.start}|${pp.end}`}>
                {pp.label}
              </option>
            ))}
          </select>
          <Badge variant="outline" className={statusStyle.className}>
            {statusStyle.label}
          </Badge>
        </div>
      </div>

      {/* Rejection reason banner */}
      {status === "rejected" && timesheet?.rejectionReason && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <span className="font-semibold text-red-800">Rejected: </span>
          <span className="text-red-700">{timesheet.rejectionReason}</span>
          <span className="text-red-600 ml-2">— Please correct and resubmit.</span>
        </div>
      )}
    </div>
  );
}
