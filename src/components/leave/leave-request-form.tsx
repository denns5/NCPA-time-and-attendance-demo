"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LeaveBalanceDetail,
  LeaveType,
  LEAVE_TYPE_LABELS,
  SHIFT_WORKER_ONLY_TYPES,
  defaultHoursPerDay,
  isShiftWorker,
} from "@/lib/leave-types";
import { Send, AlertCircle, CheckCircle2 } from "lucide-react";

interface LeaveRequestFormProps {
  balances: LeaveBalanceDetail[];
  employeeType: string;
  scheduleType: string;
  employeeId: number;
  onSubmitted: () => void;
}

export function LeaveRequestForm({
  balances,
  employeeType,
  scheduleType,
  employeeId,
  onSubmitted,
}: LeaveRequestFormProps) {
  const [leaveType, setLeaveType] = useState<LeaveType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState(defaultHoursPerDay(scheduleType));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isShift = employeeType === "ibew_1245";

  const availableTypes = balances
    .filter((b) => b.balanceHours > 0)
    .filter((b) => isShift || !SHIFT_WORKER_ONLY_TYPES.includes(b.leaveType))
    .map((b) => b.leaveType);

  // Count working days in date range
  const workingDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    if (start > end) return 0;

    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (isShiftWorker(scheduleType)) {
        // Shift workers work any day
        count++;
      } else {
        // Non-shift: Mon-Fri only
        const dow = d.getDay();
        if (dow >= 1 && dow <= 5) count++;
      }
    }
    return count;
  }, [startDate, endDate, scheduleType]);

  const totalHours = workingDays * hoursPerDay;

  const selectedBalance = leaveType
    ? balances.find((b) => b.leaveType === leaveType)
    : null;

  const remainingAfter = selectedBalance
    ? selectedBalance.balanceHours - totalHours
    : null;

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!leaveType) errors.push("Select a leave type");
    if (!startDate) errors.push("Select a start date");
    if (!endDate) errors.push("Select an end date");
    if (startDate && endDate && startDate > endDate) errors.push("Start date must be before end date");
    if (totalHours <= 0 && startDate && endDate) errors.push("No working days in selected range");
    if (remainingAfter !== null && remainingAfter < 0) {
      errors.push(`Insufficient balance (need ${totalHours}h, have ${selectedBalance?.balanceHours}h)`);
    }
    return errors;
  }, [leaveType, startDate, endDate, totalHours, remainingAfter, selectedBalance]);

  const canSubmit = validationErrors.length === 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !leaveType) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_request",
          employeeId,
          leaveType,
          startDate,
          endDate,
          totalHours,
          notes: notes || undefined,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: "success", text: "Leave request submitted successfully!" });
        // Reset form
        setLeaveType("");
        setStartDate("");
        setEndDate("");
        setNotes("");
        onSubmitted();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to submit request." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New Leave Request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Leave Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Leave Type</label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveType)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Select leave type...</option>
            {availableTypes.map((type) => {
              const bal = balances.find((b) => b.leaveType === type);
              return (
                <option key={type} value={type}>
                  {LEAVE_TYPE_LABELS[type]} ({bal?.balanceHours}h available)
                </option>
              );
            })}
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
              }}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
        </div>

        {/* Hours Per Day */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Hours Per Day</label>
          <input
            type="number"
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            min={1}
            max={24}
            step={1}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          />
          {scheduleType === "9_80" && (
            <p className="text-xs text-muted-foreground">
              Note: Alternate Fridays are 8 hours (default shown is 9)
            </p>
          )}
        </div>

        {/* Calculated Summary */}
        {startDate && endDate && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Working days</span>
              <span className="font-medium">{workingDays} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total hours</span>
              <span className="font-medium">{totalHours}h</span>
            </div>
            {selectedBalance && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Balance impact</span>
                <span className="font-medium">
                  {selectedBalance.balanceHours}h{" "}
                  <span className="text-muted-foreground mx-1">&rarr;</span>{" "}
                  <span className={remainingAfter !== null && remainingAfter < 0 ? "text-red-600" : "text-green-600"}>
                    {remainingAfter}h
                  </span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
          />
        </div>

        {/* Validation Errors */}
        {leaveType && validationErrors.length > 0 && (
          <div className="text-sm text-red-600 space-y-1">
            {validationErrors.map((err, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </div>
        )}

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
          <Send className="h-4 w-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Leave Request"}
        </Button>

        {/* Current balances summary */}
        {leaveType && selectedBalance && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <Badge variant="outline" className="text-xs">
              {LEAVE_TYPE_LABELS[leaveType]}
            </Badge>
            <span>Current balance: {selectedBalance.balanceHours}h</span>
            {selectedBalance.capHours && (
              <span>| Cap: {selectedBalance.capHours}h</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
