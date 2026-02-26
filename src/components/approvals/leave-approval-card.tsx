"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LeaveApprovalData = {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  submittedAt: string;
};

const LEAVE_LABELS: Record<string, string> = {
  vacation: "Vacation",
  sick: "Sick",
  float: "Float",
  lba: "LBA",
  holiday_bank: "Holiday Bank",
  comp: "Comp Time",
};

const LEAVE_COLORS: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-800",
  sick: "bg-red-100 text-red-800",
  float: "bg-purple-100 text-purple-800",
  lba: "bg-teal-100 text-teal-800",
  holiday_bank: "bg-amber-100 text-amber-800",
  comp: "bg-green-100 text-green-800",
};

export function LeaveApprovalCard({
  data,
  onApprove,
  onReject,
}: {
  data: LeaveApprovalData;
  onApprove: (id: number) => void;
  onReject: (id: number, notes: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{data.employeeName}</CardTitle>
          <Badge className={LEAVE_COLORS[data.leaveType] || "bg-gray-100 text-gray-800"}>
            {LEAVE_LABELS[data.leaveType] || data.leaveType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
          <div>
            <p className="text-muted-foreground">Dates</p>
            <p className="font-medium">{data.startDate} to {data.endDate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Hours</p>
            <p className="font-medium">{data.totalHours}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">Submitted</p>
            <p className="font-medium">{new Date(data.submittedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
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
      </CardContent>
    </Card>
  );
}
