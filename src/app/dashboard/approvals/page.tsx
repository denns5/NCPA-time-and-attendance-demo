"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { TimesheetApprovalCard } from "@/components/approvals/timesheet-approval-card";
import { LeaveApprovalCard } from "@/components/approvals/leave-approval-card";
import { Loader2, CheckCircle } from "lucide-react";

type TimesheetApproval = {
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

type LeaveApproval = {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  submittedAt: string;
};

type ApprovalsData = {
  submittedTimesheets: TimesheetApproval[];
  pendingLeave: LeaveApproval[];
};

const TABS = ["Timesheets", "Leave Requests"] as const;
type Tab = (typeof TABS)[number];

export default function ApprovalsPage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<ApprovalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Timesheets");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals?supervisorId=${employeeId}`);
      const json: ApprovalsData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load approvals data");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApproveTimesheet = async (timesheetId: number) => {
    const res = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_timesheet",
        timesheetId,
        supervisorId: employeeId,
      }),
    });
    if ((await res.json()).success) {
      setActionMessage("Timesheet approved.");
      fetchData();
    }
  };

  const handleRejectTimesheet = async (timesheetId: number, notes: string) => {
    const res = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reject_timesheet",
        timesheetId,
        supervisorId: employeeId,
        notes,
      }),
    });
    if ((await res.json()).success) {
      setActionMessage("Timesheet rejected.");
      fetchData();
    }
  };

  const handleApproveLeave = async (requestId: number) => {
    const res = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_leave",
        requestId,
        supervisorId: employeeId,
      }),
    });
    if ((await res.json()).success) {
      setActionMessage("Leave request approved.");
      fetchData();
    }
  };

  const handleRejectLeave = async (requestId: number, notes: string) => {
    const res = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reject_leave",
        requestId,
        supervisorId: employeeId,
        notes,
      }),
    });
    if ((await res.json()).success) {
      setActionMessage("Leave request rejected.");
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-destructive">Failed to load approvals data.</div>;
  }

  const tsCount = data.submittedTimesheets.length;
  const leaveCount = data.pendingLeave.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="text-muted-foreground text-sm">
          Review and approve submitted timesheets and leave requests.
        </p>
      </div>

      {actionMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle className="h-4 w-4" />
          {actionMessage}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex border-b">
        {TABS.map((tab) => {
          const count = tab === "Timesheets" ? tsCount : leaveCount;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {tab}
              {count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium px-1">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "Timesheets" && (
        <div className="space-y-3">
          {tsCount === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No timesheets pending approval.</p>
          ) : (
            data.submittedTimesheets.map((ts) => (
              <TimesheetApprovalCard
                key={ts.id}
                data={ts}
                onApprove={handleApproveTimesheet}
                onReject={handleRejectTimesheet}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "Leave Requests" && (
        <div className="space-y-3">
          {leaveCount === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No leave requests pending approval.</p>
          ) : (
            data.pendingLeave.map((lr) => (
              <LeaveApprovalCard
                key={lr.id}
                data={lr}
                onApprove={handleApproveLeave}
                onReject={handleRejectLeave}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
