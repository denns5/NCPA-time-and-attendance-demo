"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";

type TeamMember = {
  id: number;
  name: string;
  jobClassification: string;
  isRelief: boolean;
};

type ScheduleEntry = {
  id: number;
  employeeId: number;
  date: string;
  shiftCode: string;
  startTime: string | null;
  endTime: string | null;
  isModified: boolean;
  notes: string | null;
};

type SchedulingData = {
  team: TeamMember[];
  schedules: ScheduleEntry[];
  month: string;
  reliefOperators: Array<{ id: number; name: string }>;
};

const SHIFT_COLORS: Record<string, string> = {
  D: "bg-blue-100 text-blue-800",
  N: "bg-indigo-100 text-indigo-800",
  R: "bg-gray-100 text-gray-500",
  OFF: "bg-gray-100 text-gray-500",
  C: "bg-amber-100 text-amber-800",
  H: "bg-red-100 text-red-800",
  X: "bg-red-50 text-red-600 border border-red-400 font-bold",
};

type CoverageForm = {
  employeeId: number;
  date: string;
  reliefId: number;
  startTime: string;
  endTime: string;
};

export default function SchedulingPage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<SchedulingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverageForm, setCoverageForm] = useState<CoverageForm | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scheduling?supervisorId=${employeeId}`);
      const json: SchedulingData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load scheduling data");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCellClick = (empId: number, date: string, code: string) => {
    if (code !== "X") return;
    setCoverageForm({
      employeeId: empId,
      date,
      reliefId: data?.reliefOperators[0]?.id || 0,
      startTime: "06:00",
      endTime: "18:00",
    });
    setMessage(null);
  };

  const handleAssign = async () => {
    if (!coverageForm) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_coverage",
          ...coverageForm,
          supervisorId: employeeId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setMessage("Coverage assigned successfully.");
        setCoverageForm(null);
        fetchData();
      }
    } catch {
      setMessage("Failed to assign coverage.");
    } finally {
      setAssigning(false);
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
    return <div className="text-destructive">Failed to load scheduling data.</div>;
  }

  // Build date columns 1-31
  const dates: string[] = [];
  for (let d = 1; d <= 31; d++) {
    dates.push(`2024-07-${String(d).padStart(2, "0")}`);
  }

  // Build schedule lookup
  const scheduleMap = new Map<string, ScheduleEntry>();
  for (const entry of data.schedules) {
    scheduleMap.set(`${entry.employeeId}-${entry.date}`, entry);
  }

  // Count coverage gaps
  const gaps = data.schedules.filter(
    (s) => s.shiftCode === "X" && s.date >= "2024-07-15"
  );

  // Find relief availability for a date
  const getAvailableRelief = (date: string) => {
    return data.reliefOperators.filter((r) => {
      const entry = scheduleMap.get(`${r.id}-${date}`);
      return !entry || entry.shiftCode === "R" || entry.shiftCode === "OFF";
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Team Scheduling</h1>
        <p className="text-muted-foreground text-sm">
          Manage shift schedules and coverage assignments for July 2024.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <CheckCircle className="h-4 w-4" />
          {message}
        </div>
      )}

      {/* Coverage Summary */}
      {gaps.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              {gaps.length} Open Coverage Need{gaps.length !== 1 ? "s" : ""} (from Jul 15)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gaps.map((g, i) => {
                const emp = data.team.find((t) => t.id === g.employeeId);
                return (
                  <Badge key={i} variant="outline" className="text-red-600 border-red-300">
                    {emp?.name} — {new Date(g.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Assignment Form */}
      {coverageForm && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assign Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Employee</label>
                <span className="text-sm font-medium">
                  {data.team.find((t) => t.id === coverageForm.employeeId)?.name}
                </span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Date</label>
                <span className="text-sm font-medium">{coverageForm.date}</span>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Relief Operator</label>
                <select
                  className="text-sm border rounded px-2 py-1"
                  value={coverageForm.reliefId}
                  onChange={(e) => setCoverageForm({ ...coverageForm, reliefId: Number(e.target.value) })}
                >
                  {getAvailableRelief(coverageForm.date).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                  {getAvailableRelief(coverageForm.date).length === 0 && (
                    <option value={0} disabled>No relief available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Start</label>
                <input
                  type="time"
                  className="text-sm border rounded px-2 py-1"
                  value={coverageForm.startTime}
                  onChange={(e) => setCoverageForm({ ...coverageForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">End</label>
                <input
                  type="time"
                  className="text-sm border rounded px-2 py-1"
                  value={coverageForm.endTime}
                  onChange={(e) => setCoverageForm({ ...coverageForm, endTime: e.target.value })}
                />
              </div>
              <Button size="sm" onClick={handleAssign} disabled={assigning || !coverageForm.reliefId}>
                {assigning ? "Assigning..." : "Assign"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCoverageForm(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">July 2024 — Team Schedule</CardTitle>
          <p className="text-xs text-muted-foreground">Click an X cell to assign coverage. Scroll right to see all dates.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="text-xs w-max">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left font-medium min-w-[140px] border-r">
                    Employee
                  </th>
                  {dates.map((d) => {
                    const day = parseInt(d.split("-")[2]);
                    const dow = new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "narrow" });
                    const isToday = d === "2024-07-15";
                    return (
                      <th key={d} className={`px-1 py-1 text-center min-w-[32px] ${isToday ? "bg-primary/10" : ""}`}>
                        <div className="text-[10px] text-muted-foreground">{dow}</div>
                        <div className={isToday ? "font-bold text-primary" : ""}>{day}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.team.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="sticky left-0 bg-white z-10 px-3 py-1.5 font-medium border-r">
                      <div className="flex items-center gap-1">
                        {member.name}
                        {member.isRelief && (
                          <span className="text-[10px] text-amber-600 font-normal">(R)</span>
                        )}
                      </div>
                    </td>
                    {dates.map((d) => {
                      const entry = scheduleMap.get(`${member.id}-${d}`);
                      const code = entry?.shiftCode || "";
                      const isToday = d === "2024-07-15";
                      const isClickable = code === "X";

                      return (
                        <td
                          key={d}
                          className={`px-0.5 py-1 text-center ${isToday ? "bg-primary/5" : ""} ${isClickable ? "cursor-pointer" : ""}`}
                          onClick={() => isClickable && handleCellClick(member.id, d, code)}
                          title={entry?.notes || undefined}
                        >
                          {code && (
                            <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-medium leading-none ${SHIFT_COLORS[code] || "bg-gray-100"}`}>
                              {code}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(SHIFT_COLORS).map(([code, cls]) => (
          <div key={code} className="flex items-center gap-1">
            <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${cls}`}>{code}</span>
            <span className="text-muted-foreground">
              {code === "D" ? "Day" : code === "N" ? "Night" : code === "R" ? "Rest" : code === "OFF" ? "Off" : code === "C" ? "Coverage" : code === "H" ? "Holiday" : "Open"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
