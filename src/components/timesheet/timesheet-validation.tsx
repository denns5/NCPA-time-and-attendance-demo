"use client";

import { cn } from "@/lib/utils";
import {
  TimesheetRow,
  TimesheetStatus,
  LeaveBalance,
  PAY_CODE_LABELS,
  PAY_CODE_TO_BALANCE,
  CODES_REQUIRING_NOTES,
  PayCode,
} from "@/lib/timesheet-types";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  Send,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ValidationItem {
  type: "error" | "warning" | "info";
  message: string;
}

function validate(
  rows: TimesheetRow[],
  dates: string[],
  leaveBalances: LeaveBalance[]
): ValidationItem[] {
  const items: ValidationItem[] = [];

  // Total hours
  const grandTotal = rows.reduce(
    (sum, row) => sum + dates.reduce((s, d) => s + (row.hours[d] || 0), 0),
    0
  );

  // 80-hour check
  if (Math.abs(grandTotal - 80) < 0.01) {
    items.push({
      type: "info",
      message: `Total hours: ${grandTotal.toFixed(2)} — matches expected 80.00`,
    });
  } else if (grandTotal < 80) {
    items.push({
      type: "warning",
      message: `Total hours: ${grandTotal.toFixed(2)} — ${(80 - grandTotal).toFixed(2)} hours short of expected 80.00`,
    });
  } else {
    items.push({
      type: "warning",
      message: `Total hours: ${grandTotal.toFixed(2)} — ${(grandTotal - 80).toFixed(2)} hours over expected 80.00`,
    });
  }

  // Leave balance checks
  const balanceMap = new Map(leaveBalances.map((b) => [b.leaveType, b]));
  for (const row of rows) {
    const balanceType = PAY_CODE_TO_BALANCE[row.payCode];
    if (!balanceType) continue;
    const balance = balanceMap.get(balanceType);
    if (!balance) continue;

    const used = dates.reduce((sum, d) => sum + (row.hours[d] || 0), 0);
    if (used > 0 && used > balance.balanceHours) {
      items.push({
        type: "warning",
        message: `${PAY_CODE_LABELS[row.payCode]}: using ${used.toFixed(2)}h but only ${balance.balanceHours.toFixed(2)}h available`,
      });
    }
  }

  // Required notes check
  for (const row of rows) {
    if (!CODES_REQUIRING_NOTES.includes(row.payCode as PayCode)) continue;
    const used = dates.reduce((sum, d) => sum + (row.hours[d] || 0), 0);
    if (used === 0) continue;

    for (const date of dates) {
      if ((row.hours[date] || 0) > 0 && !row.notes[date]) {
        items.push({
          type: "error",
          message: `${PAY_CODE_LABELS[row.payCode]} on ${formatShortDate(date)}: note required`,
        });
      }
    }
  }

  // Check for zero-hour timesheet
  if (grandTotal === 0) {
    items.push({
      type: "error",
      message: "Timesheet has no hours entered.",
    });
  }

  return items;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface TimesheetValidationProps {
  rows: TimesheetRow[];
  dates: string[];
  leaveBalances: LeaveBalance[];
  status: TimesheetStatus;
  isReadOnly: boolean;
  showValidation: boolean;
  overrideChecked: boolean;
  overrideNote: string;
  saving: boolean;
  saveMessage: { type: "success" | "error"; text: string } | null;
  onShowValidation: (show: boolean) => void;
  onOverrideChange: (checked: boolean) => void;
  onOverrideNoteChange: (note: string) => void;
  onSave: () => void;
  onSubmit: () => void;
}

export function TimesheetValidation({
  rows,
  dates,
  leaveBalances,
  status,
  isReadOnly,
  showValidation,
  overrideChecked,
  overrideNote,
  saving,
  saveMessage,
  onShowValidation,
  onOverrideChange,
  onOverrideNoteChange,
  onSave,
  onSubmit,
}: TimesheetValidationProps) {
  const items = validate(rows, dates, leaveBalances);
  const errors = items.filter((i) => i.type === "error");
  const warnings = items.filter((i) => i.type === "warning");
  const infos = items.filter((i) => i.type === "info");

  const grandTotal = rows.reduce(
    (sum, row) => sum + dates.reduce((s, d) => s + (row.hours[d] || 0), 0),
    0
  );
  const needs80Override = Math.abs(grandTotal - 80) >= 0.01;
  const canSubmit =
    errors.length === 0 && (!needs80Override || (overrideChecked && overrideNote.trim()));

  if (isReadOnly) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-4 py-3 bg-muted/30">
        <Info className="h-4 w-4" />
        {status === "submitted" && "This timesheet has been submitted and is awaiting approval."}
        {status === "approved" && "This timesheet has been approved."}
        {status === "processed" && "This timesheet has been processed for payroll."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={onSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Draft
        </Button>

        <Button
          onClick={() => {
            if (!showValidation) {
              onShowValidation(true);
            } else if (canSubmit) {
              onSubmit();
            }
          }}
          disabled={saving || (showValidation && !canSubmit)}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {showValidation ? "Confirm & Submit" : "Submit for Approval"}
        </Button>

        {showValidation && (
          <button
            onClick={() => onShowValidation(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}

        {/* Save feedback */}
        {saveMessage && (
          <span
            className={cn(
              "text-sm font-medium",
              saveMessage.type === "success"
                ? "text-green-600"
                : "text-destructive"
            )}
          >
            {saveMessage.text}
          </span>
        )}
      </div>

      {/* Validation panel */}
      {showValidation && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <h3 className="font-semibold text-sm">Submission Validation</h3>

          {infos.map((item, i) => (
            <div key={`info-${i}`} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span>{item.message}</span>
            </div>
          ))}

          {warnings.map((item, i) => (
            <div
              key={`warn-${i}`}
              className="flex items-start gap-2 text-sm text-yellow-700"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{item.message}</span>
            </div>
          ))}

          {errors.map((item, i) => (
            <div
              key={`err-${i}`}
              className="flex items-start gap-2 text-sm text-destructive"
            >
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{item.message}</span>
            </div>
          ))}

          {/* 80-hour override */}
          {needs80Override && errors.length === 0 && (
            <div className="border-t pt-3 mt-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={overrideChecked}
                  onChange={(e) => onOverrideChange(e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <span>
                  I authorize submission with{" "}
                  <strong>{grandTotal.toFixed(2)}</strong> total hours
                  (expected 80.00)
                </span>
              </label>
              {overrideChecked && (
                <textarea
                  value={overrideNote}
                  onChange={(e) => onOverrideNoteChange(e.target.value)}
                  placeholder="Explain why hours differ from 80 (required)..."
                  rows={2}
                  className="mt-2 w-full border rounded-md p-2 text-sm resize-none focus:ring-1 focus:ring-primary/30 focus:outline-none"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
