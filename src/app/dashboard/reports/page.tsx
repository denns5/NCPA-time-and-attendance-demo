"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Users, Clock, TrendingUp } from "lucide-react";

const TABS = ["Summary", "Hours by Employee", "OT Analysis", "Leave Usage"] as const;
type Tab = (typeof TABS)[number];
const TAB_TYPES: Record<Tab, string> = {
  Summary: "summary",
  "Hours by Employee": "hours",
  "OT Analysis": "overtime",
  "Leave Usage": "leave",
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

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Summary");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(TAB_TYPES[activeTab]);
  }, [activeTab, fetchData]);

  const handleTabChange = (tab: Tab) => {
    setData(null);
    setLoading(true);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">
            Payroll summaries, hours analysis, overtime trends, and leave usage.
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="text-destructive">Failed to load report.</div>
      ) : (
        <>
          {activeTab === "Summary" && <SummaryReport data={data} />}
          {activeTab === "Hours by Employee" && <HoursReport data={data} />}
          {activeTab === "OT Analysis" && <OTReport data={data} />}
          {activeTab === "Leave Usage" && <LeaveReport data={data} />}
        </>
      )}
    </div>
  );
}

function SummaryReport({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{data.stats.totalEmployees}</p>
                <p className="text-xs text-muted-foreground">Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Clock className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{data.stats.totalHours}</p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><BarChart3 className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{data.stats.totalTimesheets}</p>
                <p className="text-xs text-muted-foreground">Timesheets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-2xl font-bold">{data.stats.approvedTimesheets}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Hours by Pay Code</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Pay Code</th>
                <th className="py-2 text-right font-medium">Hours</th>
                <th className="py-2 text-right font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {data.hoursByCode.map((item: any) => (
                <tr key={item.code} className="border-b last:border-0">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{PAY_CODE_LABELS[item.code] || item.code}</span>
                      <span className="text-xs text-muted-foreground font-mono">{item.code}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right font-medium">{item.hours}</td>
                  <td className="py-2 text-right text-muted-foreground">
                    {data.stats.totalHours > 0 ? Math.round((item.hours / data.stats.totalHours) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function HoursReport({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Hours by Employee</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Employee</th>
                <th className="py-2 text-left font-medium">Type</th>
                <th className="py-2 text-right font-medium">REG</th>
                <th className="py-2 text-right font-medium">OT 1.5x</th>
                <th className="py-2 text-right font-medium">OT 2.0x</th>
                <th className="py-2 text-right font-medium">VAC</th>
                <th className="py-2 text-right font-medium">SICK</th>
                <th className="py-2 text-right font-medium">Other</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp: any) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{emp.name}</td>
                  <td className="py-2">
                    <Badge variant="outline" className="text-xs">
                      {emp.employeeType === "ibew_1245" ? "IBEW" : emp.employeeType === "hea" ? "HEA" : "Non-Union"}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">{emp.reg || "—"}</td>
                  <td className="py-2 text-right">{emp.ot15 || "—"}</td>
                  <td className="py-2 text-right">{emp.ot20 || "—"}</td>
                  <td className="py-2 text-right">{emp.vac || "—"}</td>
                  <td className="py-2 text-right">{emp.sick || "—"}</td>
                  <td className="py-2 text-right">{emp.other || "—"}</td>
                  <td className="py-2 text-right font-bold">{emp.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function OTReport({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{data.totals.ot15}</p>
            <p className="text-xs text-muted-foreground">OT 1.5x Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{data.totals.ot20}</p>
            <p className="text-xs text-muted-foreground">OT 2.0x Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-amber-600">{data.totals.totalOT}</p>
            <p className="text-xs text-muted-foreground">Total OT Hours</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Overtime by Employee</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Employee</th>
                <th className="py-2 text-left font-medium">Type</th>
                <th className="py-2 text-left font-medium">Schedule</th>
                <th className="py-2 text-right font-medium">REG</th>
                <th className="py-2 text-right font-medium">OT 1.5x</th>
                <th className="py-2 text-right font-medium">OT 2.0x</th>
                <th className="py-2 text-right font-medium">Total OT</th>
                <th className="py-2 text-right font-medium">OT %</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp: any) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{emp.name}</td>
                  <td className="py-2 text-muted-foreground text-xs">
                    {emp.employeeType === "ibew_1245" ? "IBEW" : emp.employeeType === "hea" ? "HEA" : "Non-Union"}
                  </td>
                  <td className="py-2 text-muted-foreground text-xs">
                    {emp.scheduleType === "12_hour_rotating" ? "12-Hr" : emp.scheduleType === "9_80" ? "9/80" : emp.scheduleType === "4_10" ? "4/10" : "8/80"}
                  </td>
                  <td className="py-2 text-right">{emp.reg}</td>
                  <td className="py-2 text-right">{emp.ot15 || "—"}</td>
                  <td className="py-2 text-right">{emp.ot20 || "—"}</td>
                  <td className="py-2 text-right font-medium text-amber-600">{emp.totalOT || "—"}</td>
                  <td className="py-2 text-right text-muted-foreground">{emp.otPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaveReport({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Leave Usage by Employee</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Employee</th>
                <th className="py-2 text-left font-medium">Type</th>
                <th className="py-2 text-right font-medium">Vac Used</th>
                <th className="py-2 text-right font-medium">Vac Balance</th>
                <th className="py-2 text-right font-medium">Sick Used</th>
                <th className="py-2 text-right font-medium">Sick Balance</th>
                <th className="py-2 text-right font-medium">Other Used</th>
                <th className="py-2 text-center font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((emp: any) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{emp.name}</td>
                  <td className="py-2">
                    <Badge variant="outline" className="text-xs">
                      {emp.employeeType === "ibew_1245" ? "IBEW" : emp.employeeType === "hea" ? "HEA" : "Non-Union"}
                    </Badge>
                  </td>
                  <td className="py-2 text-right">{emp.vacUsed || "—"}</td>
                  <td className="py-2 text-right font-medium">{emp.vacBalance}</td>
                  <td className="py-2 text-right">{emp.sickUsed || "—"}</td>
                  <td className="py-2 text-right font-medium">{emp.sickBalance}</td>
                  <td className="py-2 text-right">{emp.otherUsed || "—"}</td>
                  <td className="py-2 text-center">
                    {emp.pendingRequests > 0 ? (
                      <Badge variant="secondary" className="text-xs">{emp.pendingRequests}</Badge>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
