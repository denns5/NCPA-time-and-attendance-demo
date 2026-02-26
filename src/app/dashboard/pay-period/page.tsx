"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight, CheckCircle, Clock } from "lucide-react";

type EmployeeDetail = {
  id: number;
  name: string;
  employeeType: string;
  timesheetStatus: string;
  totalHours: number;
};

type PayPeriod = {
  start: string;
  end: string;
  label: string;
  status: string;
  timesheetCount: number;
  totalEmployees: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  processedCount: number;
  rejectedCount: number;
  totalHours: number;
  percentComplete: number;
  employees: EmployeeDetail[];
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-gray-100 text-gray-600",
  in_progress: "bg-yellow-100 text-yellow-800",
  ready: "bg-green-100 text-green-800",
  processed: "bg-purple-100 text-purple-800",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  ready: "Ready to Process",
  processed: "Processed",
};

const TS_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  processed: "bg-purple-100 text-purple-800",
};

export default function PayPeriodPage() {
  const { employeeId } = useRole();
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPP, setExpandedPP] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pay-period");
      if (!res.ok) return;
      const json = await res.json();
      setPeriods(json.periods || []);
    } catch {
      console.error("Failed to load pay period data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcess = async (pp: PayPeriod) => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pay-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process",
          ppStart: pp.start,
          ppEnd: pp.end,
          adminId: employeeId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage(`Processed ${result.processedCount} timesheets for ${pp.label}.`);
        fetchData();
      } else {
        setMessage(result.error || "Failed to process.");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pay Period Processing</h1>
        <p className="text-muted-foreground text-sm">
          Review timesheet status and process approved timesheets for payroll.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {periods.map((pp) => {
          const ppKey = `${pp.start}-${pp.end}`;
          const isExpanded = expandedPP === ppKey;

          return (
            <Card key={ppKey} className={pp.status === "ready" ? "border-green-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{pp.label}</CardTitle>
                  <Badge className={STATUS_COLORS[pp.status] || "bg-gray-100"}>
                    {STATUS_LABELS[pp.status] || pp.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{pp.percentComplete}% complete</span>
                    <span>{pp.approvedCount + pp.processedCount}/{pp.totalEmployees} approved</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${pp.percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="text-center p-1.5 bg-muted/50 rounded">
                    <p className="font-bold text-sm">{pp.timesheetCount}</p>
                    <p className="text-muted-foreground">Timesheets</p>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded">
                    <p className="font-bold text-sm">{pp.totalHours}</p>
                    <p className="text-muted-foreground">Total Hours</p>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded">
                    <p className="font-bold text-sm">{pp.submittedCount}</p>
                    <p className="text-muted-foreground">Pending</p>
                  </div>
                </div>

                {/* Expand/Collapse */}
                <button
                  onClick={() => setExpandedPP(isExpanded ? null : ppKey)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline mb-2"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {isExpanded ? "Hide" : "Show"} employee detail
                </button>

                {isExpanded && (
                  <div className="mb-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1 text-left font-medium">Employee</th>
                          <th className="py-1 text-left font-medium">Status</th>
                          <th className="py-1 text-right font-medium">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pp.employees.map((emp) => (
                          <tr key={emp.id} className="border-b last:border-0">
                            <td className="py-1">{emp.name}</td>
                            <td className="py-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${TS_STATUS_COLORS[emp.timesheetStatus] || "bg-gray-100"}`}>
                                {emp.timesheetStatus === "not_started" ? "Not Started" : emp.timesheetStatus.charAt(0).toUpperCase() + emp.timesheetStatus.slice(1)}
                              </span>
                            </td>
                            <td className="py-1 text-right">{emp.totalHours || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Process Button */}
                {pp.status === "ready" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleProcess(pp)}
                    disabled={processing}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    {processing ? "Processing..." : "Process Pay Period"}
                  </Button>
                )}
                {pp.status === "processed" && (
                  <div className="flex items-center justify-center gap-1 text-xs text-green-700 bg-green-50 py-1.5 rounded">
                    <CheckCircle className="h-3 w-3" />
                    All timesheets processed
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
