"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TimesheetApprovalData = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeType: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  submittedAt: string | null;
  hoursByCode: Record<string, number>;
  totalHours: number;
  entryCount: number;
};

const PAY_CODE_LABELS: Record<string, string> = {
  REG: "Regular",
  OT_1_5: "OT 1.5x",
  OT_2_0: "OT 2.0x",
  VAC: "Vacation",
  SICK: "Sick",
  FLOAT: "Float",
  HOL: "Holiday",
  COMP: "Comp Time",
  LBA: "LBA",
  TRAIN: "Training",
  JURY: "Jury Duty",
  BEREAVEMENT: "Bereavement",
  ADMIN: "Admin",
  LWOP: "Leave w/o Pay",
  FAM_SICK: "Family Sick",
};

export function TimesheetApprovalCard({
  data,
  onApprove,
  onReject,
}: {
  data: TimesheetApprovalData;
  onApprove: (id: number) => void;
  onReject: (id: number, notes: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const empTypeLabel =
    data.employeeType === "ibew_1245"
      ? "IBEW 1245"
      : data.employeeType === "hea"
      ? "HEA"
      : "Non-Union";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{data.employeeName}</CardTitle>
          <Badge variant="outline">{empTypeLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Pay Period: {data.payPeriodStart} to {data.payPeriodEnd}
        </p>
        {data.submittedAt && (
          <p className="text-xs text-muted-foreground">
            Submitted: {new Date(data.submittedAt).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {/* Hours Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {Object.entries(data.hoursByCode).map(([code, hours]) => (
            <div key={code} className="flex justify-between text-sm bg-muted/50 px-2 py-1 rounded">
              <span className="text-muted-foreground">{PAY_CODE_LABELS[code] || code}</span>
              <span className="font-medium">{hours}h</span>
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total: {data.totalHours}h</span>
          <div className="flex gap-2">
            {rejecting ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Reason for rejection..."
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="text-sm border rounded px-2 py-1 w-48"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!rejectNotes.trim()}
                  onClick={() => {
                    onReject(data.id, rejectNotes);
                    setRejecting(false);
                    setRejectNotes("");
                  }}
                >
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setRejecting(false); setRejectNotes(""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
                  Reject
                </Button>
                <Button size="sm" onClick={() => onApprove(data.id)}>
                  Approve
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
