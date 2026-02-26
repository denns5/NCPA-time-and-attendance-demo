"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaveBalanceDetail } from "@/lib/leave-types";
import { DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";

interface LeaveSellBackProps {
  vacationBalance: LeaveBalanceDetail | undefined;
  employeeId: number;
  onComplete: () => void;
}

export function LeaveSellBack({ vacationBalance, employeeId, onComplete }: LeaveSellBackProps) {
  const [hours, setHours] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!vacationBalance || vacationBalance.balanceHours <= 0) return null;

  const maxHours = vacationBalance.balanceHours;
  const newBalance = vacationBalance.balanceHours - hours;

  const handleSubmit = async () => {
    if (hours <= 0 || hours > maxHours) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sell_back", employeeId, hours }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: "success", text: `Successfully sold back ${hours}h of vacation time.` });
        setHours(0);
        onComplete();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to process sell-back." });
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
          <DollarSign className="h-5 w-5 text-green-600" />
          <CardTitle className="text-base">Vacation Sell-Back</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Convert vacation hours to cash payment at your current rate.
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium">Hours to Sell</label>
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
            {submitting ? "Processing..." : "Sell Back"}
          </Button>
        </div>

        {hours > 0 && (
          <div className="text-sm p-2 rounded bg-muted/50">
            Selling <span className="font-medium">{hours}h</span> — Balance:{" "}
            <span className="font-medium">{vacationBalance.balanceHours}h</span>{" "}
            <span className="text-muted-foreground mx-1">&rarr;</span>{" "}
            <span className="font-medium text-green-600">{newBalance}h</span>
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
