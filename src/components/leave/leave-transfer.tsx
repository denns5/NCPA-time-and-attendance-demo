"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LeaveBalanceDetail,
  LeaveType,
  LEAVE_TYPE_LABELS,
} from "@/lib/leave-types";
import { ArrowRightLeft, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Allowed transfer directions:
 * - comp → vacation
 * - holiday_bank → vacation (shift workers only)
 */
const TRANSFER_RULES: Record<string, string[]> = {
  comp: ["vacation"],
  holiday_bank: ["vacation"],
};

interface LeaveTransferProps {
  balances: LeaveBalanceDetail[];
  employeeType: string;
  employeeId: number;
  onComplete: () => void;
}

export function LeaveTransfer({ balances, employeeType, employeeId, onComplete }: LeaveTransferProps) {
  const [fromType, setFromType] = useState<LeaveType | "">("");
  const [toType, setToType] = useState<LeaveType | "">("");
  const [hours, setHours] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isShift = employeeType === "ibew_1245";

  // Source types: balance > 0 and has allowed transfer destinations
  const sourceTypes = useMemo(() => {
    return balances
      .filter((b) => b.balanceHours > 0 && TRANSFER_RULES[b.leaveType])
      .filter((b) => isShift || b.leaveType !== "holiday_bank")
      .map((b) => b.leaveType);
  }, [balances, isShift]);

  // Destination types based on selected source
  const destTypes = useMemo(() => {
    if (!fromType) return [];
    return (TRANSFER_RULES[fromType] || []) as LeaveType[];
  }, [fromType]);

  const sourceBalance = fromType ? balances.find((b) => b.leaveType === fromType) : null;
  const destBalance = toType ? balances.find((b) => b.leaveType === toType) : null;
  const maxHours = sourceBalance?.balanceHours || 0;

  // If there are no transferable balances, don't render
  if (sourceTypes.length === 0) return null;

  const handleSubmit = async () => {
    if (!fromType || !toType || hours <= 0 || hours > maxHours) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          employeeId,
          fromType,
          toType,
          hours,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: "success", text: `Transferred ${hours}h from ${LEAVE_TYPE_LABELS[fromType]} to ${LEAVE_TYPE_LABELS[toType as LeaveType]}.` });
        setFromType("");
        setToType("");
        setHours(0);
        onComplete();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to process transfer." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
          <CardTitle className="text-base">Leave Transfer</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Transfer hours between eligible leave buckets.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* From */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">From</label>
            <select
              value={fromType}
              onChange={(e) => {
                setFromType(e.target.value as LeaveType);
                setToType("");
                setHours(0);
              }}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">Select source...</option>
              {sourceTypes.map((type) => {
                const bal = balances.find((b) => b.leaveType === type);
                return (
                  <option key={type} value={type}>
                    {LEAVE_TYPE_LABELS[type]} ({bal?.balanceHours}h)
                  </option>
                );
              })}
            </select>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">To</label>
            <select
              value={toType}
              onChange={(e) => setToType(e.target.value as LeaveType)}
              disabled={!fromType}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50"
            >
              <option value="">Select destination...</option>
              {destTypes.map((type) => {
                const bal = balances.find((b) => b.leaveType === type);
                return (
                  <option key={type} value={type}>
                    {LEAVE_TYPE_LABELS[type]} ({bal?.balanceHours}h)
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Hours */}
        {fromType && toType && (
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium">Hours to Transfer</label>
              <input
                type="number"
                value={hours || ""}
                onChange={(e) => setHours(Math.min(Number(e.target.value), maxHours))}
                min={1}
                max={maxHours}
                step={1}
                placeholder="0"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={hours <= 0 || hours > maxHours || submitting}
              size="default"
            >
              {submitting ? "Transferring..." : "Transfer"}
            </Button>
          </div>
        )}

        {/* Preview */}
        {hours > 0 && sourceBalance && destBalance && (
          <div className="text-sm p-2 rounded bg-muted/50 space-y-1">
            <div className="flex justify-between">
              <span>{LEAVE_TYPE_LABELS[fromType as LeaveType]}</span>
              <span>
                {sourceBalance.balanceHours}h{" "}
                <span className="text-muted-foreground mx-1">&rarr;</span>{" "}
                <span className="text-red-600">{sourceBalance.balanceHours - hours}h</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span>{LEAVE_TYPE_LABELS[toType as LeaveType]}</span>
              <span>
                {destBalance.balanceHours}h{" "}
                <span className="text-muted-foreground mx-1">&rarr;</span>{" "}
                <span className="text-green-600">
                  {destBalance.capHours
                    ? Math.min(destBalance.balanceHours + hours, destBalance.capHours)
                    : destBalance.balanceHours + hours}h
                </span>
              </span>
            </div>
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}
