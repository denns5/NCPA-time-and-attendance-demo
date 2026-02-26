"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil } from "lucide-react";

type ScheduleEntry = {
  id: number;
  employeeId: number;
  date: string;
  shiftCode: string;
  startTime: string | null;
  endTime: string | null;
  isModified: boolean;
  modifiedBy: number | null;
  notes: string | null;
};

type EmployeeInfo = {
  id: number;
  name: string;
  employeeType: string;
  scheduleType: string;
  location: string;
  department: string;
  jobClassification: string;
};

type ScheduleData = {
  employee: EmployeeInfo;
  schedules: ScheduleEntry[];
  month: string;
};

const SHIFT_COLORS: Record<string, string> = {
  D: "bg-blue-100 text-blue-800",
  N: "bg-indigo-100 text-indigo-800",
  R: "bg-gray-100 text-gray-600",
  OFF: "bg-gray-100 text-gray-600",
  C: "bg-amber-100 text-amber-800",
  H: "bg-red-100 text-red-800",
  X: "border border-red-500 text-red-600 bg-white",
};

const SHIFT_LABELS: Record<string, string> = {
  D: "Day Shift",
  N: "Night Shift",
  R: "Rest Day",
  OFF: "Off",
  C: "Coverage",
  H: "Holiday",
  X: "Open (Needs Coverage)",
};

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DEMO_TODAY = "2024-07-15";

export default function SchedulePage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?employeeId=${employeeId}`);
      const json: ScheduleData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load schedule data");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-destructive">Failed to load schedule data.</div>;
  }

  // Build calendar grid for July 2024
  const year = 2024;
  const month = 6; // 0-indexed: July
  const firstDay = new Date(year, month, 1).getDay(); // Day of week (0=Sun)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map schedules by date
  const scheduleMap = new Map<string, ScheduleEntry>();
  for (const entry of data.schedules) {
    scheduleMap.set(entry.date, entry);
  }

  // Build cells: padding + days
  const cells: Array<{ day: number | null; entry?: ScheduleEntry }> = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `2024-07-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, entry: scheduleMap.get(dateStr) });
  }
  // Pad end
  while (cells.length % 7 !== 0) {
    cells.push({ day: null });
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <p className="text-muted-foreground text-sm">
          View your shift schedule, coverage assignments, and upcoming changes.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-medium">{data.employee.name}</span>
        <Badge variant="outline">{empTypeLabel}</Badge>
        <Badge variant="secondary">{scheduleLabel}</Badge>
        <Badge variant="secondary">{data.employee.location}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">July 2024</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (cell.day === null) {
                return <div key={i} className="h-24 rounded bg-gray-50" />;
              }
              const dateStr = `2024-07-${String(cell.day).padStart(2, "0")}`;
              const isToday = dateStr === DEMO_TODAY;
              const entry = cell.entry;
              const code = entry?.shiftCode || "";

              return (
                <div
                  key={i}
                  className={`h-24 rounded border p-1 flex flex-col ${
                    isToday ? "ring-2 ring-primary border-primary" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {cell.day}
                    </span>
                    {entry?.isModified && (
                      <Pencil className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                  {code && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          SHIFT_COLORS[code] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {code}
                      </span>
                      {(code === "D" || code === "N" || code === "C") && entry?.startTime && entry?.endTime && (
                        <span className="text-[10px] text-muted-foreground">
                          {entry.startTime}–{entry.endTime}
                        </span>
                      )}
                    </div>
                  )}
                  {entry?.notes && (
                    <p className="text-[10px] text-muted-foreground truncate" title={entry.notes}>
                      {entry.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shift Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Shift Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(SHIFT_LABELS).map(([code, label]) => (
              <div key={code} className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                    SHIFT_COLORS[code] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {code}
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
