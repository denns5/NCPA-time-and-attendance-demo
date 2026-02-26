"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { LeavePageData } from "@/lib/leave-types";
import { LeaveBalances } from "@/components/leave/leave-balances";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveHistory } from "@/components/leave/leave-history";
import { LeaveSellBack } from "@/components/leave/leave-sell-back";
import { LeaveTransfer } from "@/components/leave/leave-transfer";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const TABS = ["Balances", "Request Leave", "History"] as const;
type Tab = (typeof TABS)[number];

export default function LeavePage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<LeavePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Balances");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave?employeeId=${employeeId}`);
      const json: LeavePageData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-destructive">Failed to load leave data.</div>;
  }

  const empTypeLabel =
    data.employee.employeeType === "ibew_1245"
      ? "IBEW 1245"
      : data.employee.employeeType === "hea"
      ? "HEA"
      : "Non-Union";

  const scheduleLabel =
    data.employee.scheduleType === "12_hour_rotating"
      ? "12-Hour Rotating"
      : data.employee.scheduleType === "9_80"
      ? "9/80"
      : data.employee.scheduleType === "4_10"
      ? "4/10"
      : "8/80";

  const pendingCount = data.requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground text-sm">
          View balances, submit requests, and track leave history.
        </p>
      </div>

      {/* Employee Info Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-medium">{data.employee.name}</span>
        <Badge variant="outline">{empTypeLabel}</Badge>
        <Badge variant="secondary">{scheduleLabel}</Badge>
        <Badge variant="secondary">{data.employee.location}</Badge>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b">
        {TABS.map((tab) => (
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
            {tab === "History" && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Balances" && (
        <div className="space-y-6">
          <LeaveBalances
            balances={data.balances}
            employeeType={data.employee.employeeType}
          />

          {/* Sell-back and Transfer below balances */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LeaveSellBack
              vacationBalance={data.balances.find((b) => b.leaveType === "vacation")}
              employeeId={data.employee.id}
              onComplete={handleRefresh}
            />
            <LeaveTransfer
              balances={data.balances}
              employeeType={data.employee.employeeType}
              employeeId={data.employee.id}
              onComplete={handleRefresh}
            />
          </div>
        </div>
      )}

      {activeTab === "Request Leave" && (
        <LeaveRequestForm
          balances={data.balances}
          employeeType={data.employee.employeeType}
          scheduleType={data.employee.scheduleType}
          employeeId={data.employee.id}
          onSubmitted={handleRefresh}
        />
      )}

      {activeTab === "History" && (
        <LeaveHistory
          requests={data.requests}
          employeeId={data.employee.id}
          onCancelled={handleRefresh}
        />
      )}
    </div>
  );
}
