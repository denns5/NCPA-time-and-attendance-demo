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

const CLICKABLE_CODES = new Set(["D", "N", "C", "X"]);

type EditAction = "assign_coverage" | "mark_absent" | "swap_shift" | "add_note" | null;

type EditState = {
  employeeId: number;
  employeeName: string;
  date: string;
  currentCode: string;
  action: EditAction;
  // Form fields
  reliefId: number;
  startTime: string;
  endTime: string;
  reason: string;
  newShiftCode: string;
  note: string;
};

export default function SchedulingPage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<SchedulingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

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
    if (!CLICKABLE_CODES.has(code)) return;
    const member = data?.team.find((t) => t.id === empId);
    const defaultTimes = code === "N" ? { start: "18:00", end: "06:00" } : { start: "06:00", end: "18:00" };
    setEditState({
      employeeId: empId,
      employeeName: member?.name || "",
      date,
      currentCode: code,
      action: null,
      reliefId: data?.reliefOperators[0]?.id || 0,
      startTime: defaultTimes.start,
      endTime: defaultTimes.end,
      reason: "",
      newShiftCode: code === "D" ? "N" : "D",
      note: "",
    });
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (!editState || !editState.action) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        action: editState.action,
        employeeId: editState.employeeId,
        date: editState.date,
        supervisorId: employeeId,
      };

      if (editState.action === "assign_coverage") {
        payload.reliefId = editState.reliefId;
        payload.startTime = editState.startTime;
        payload.endTime = editState.endTime;
      } else if (editState.action === "mark_absent") {
        payload.reason = editState.reason;
      } else if (editState.action === "swap_shift") {
        payload.newShiftCode = editState.newShiftCode;
      } else if (editState.action === "add_note") {
        payload.note = editState.note;
      }

      const res = await fetch("/api/scheduling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        const labels: Record<string, string> = {
          assign_coverage: "Coverage assigned",
          mark_absent: "Shift marked absent",
          swap_shift: "Shift swapped",
          add_note: "Note added",
        };
        setMessage({ text: labels[editState.action] + " successfully.", type: "success" });
        setEditState(null);
        fetchData();
      } else {
        setMessage({ text: result.error || "Action failed.", type: "error" });
      }
    } catch {
      setMessage({ text: "Request failed.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const isConfirmDisabled = () => {
    if (!editState?.action) return true;
    if (editState.action === "mark_absent" && !editState.reason.trim()) return true;
    if (editState.action === "assign_coverage" && !editState.reliefId) return true;
    if (editState.action === "add_note" && !editState.note.trim()) return true;
    return false;
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

  // Count coverage gaps — all X codes, no date filter
  const gaps = data.schedules.filter((s) => s.shiftCode === "X");

  // Find relief availability for a date
  const getAvailableRelief = (date: string) => {
    return data.reliefOperators.filter((r) => {
      const entry = scheduleMap.get(`${r.id}-${date}`);
      return !entry || entry.shiftCode === "R" || entry.shiftCode === "OFF";
    });
  };

  // Actions available per shift code
  const getActions = (code: string): Array<{ key: EditAction; label: string }> => {
    if (code === "D" || code === "N") {
      return [
        { key: "mark_absent", label: "Mark Absent" },
        { key: "swap_shift", label: `Swap to ${code === "D" ? "Night" : "Day"}` },
        { key: "add_note", label: "Add Note" },
      ];
    }
    if (code === "X") {
      return [
        { key: "assign_coverage", label: "Assign Coverage" },
        { key: "add_note", label: "Add Note" },
      ];
    }
    if (code === "C") {
      return [{ key: "add_note", label: "Add Note" }];
    }
    return [];
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
        <div className={`flex items-center gap-2 p-3 border rounded-lg text-sm ${
          message.type === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <CheckCircle className="h-4 w-4" />
          {message.text}
        </div>
      )}

      {/* Coverage Summary */}
      {gaps.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              {gaps.length} Open Coverage Need{gaps.length !== 1 ? "s" : ""}
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

      {/* Unified Edit Card */}
      {editState && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Edit Shift — {editState.employeeName} on{" "}
              {new Date(editState.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              {" "}
              <Badge className={`ml-1 ${SHIFT_COLORS[editState.currentCode] || ""}`}>
                {editState.currentCode}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Action buttons */}
            {!editState.action && (
              <div className="flex flex-wrap gap-2">
                {getActions(editState.currentCode).map((a) => (
                  <Button
                    key={a.key}
                    size="sm"
                    variant="outline"
                    onClick={() => setEditState({ ...editState, action: a.key })}
                  >
                    {a.label}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => setEditState(null)}>
                  Cancel
                </Button>
              </div>
            )}

            {/* Mark Absent form */}
            {editState.action === "mark_absent" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground block mb-1">Reason (required)</label>
                  <input
                    type="text"
                    className="text-sm border rounded px-2 py-1 w-full"
                    placeholder="e.g. Sick call, personal day"
                    value={editState.reason}
                    onChange={(e) => setEditState({ ...editState, reason: e.target.value })}
                  />
                </div>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || isConfirmDisabled()}>
                  {submitting ? "Saving..." : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditState({ ...editState, action: null })}>
                  Back
                </Button>
              </div>
            )}

            {/* Assign Coverage form */}
            {editState.action === "assign_coverage" && (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Relief Operator</label>
                  <select
                    className="text-sm border rounded px-2 py-1"
                    value={editState.reliefId}
                    onChange={(e) => setEditState({ ...editState, reliefId: Number(e.target.value) })}
                  >
                    {getAvailableRelief(editState.date).map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                    {getAvailableRelief(editState.date).length === 0 && (
                      <option value={0} disabled>No relief available</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Start</label>
                  <input
                    type="time"
                    className="text-sm border rounded px-2 py-1"
                    value={editState.startTime}
                    onChange={(e) => setEditState({ ...editState, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">End</label>
                  <input
                    type="time"
                    className="text-sm border rounded px-2 py-1"
                    value={editState.endTime}
                    onChange={(e) => setEditState({ ...editState, endTime: e.target.value })}
                  />
                </div>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || isConfirmDisabled()}>
                  {submitting ? "Assigning..." : "Assign"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditState({ ...editState, action: null })}>
                  Back
                </Button>
              </div>
            )}

            {/* Swap Shift form */}
            {editState.action === "swap_shift" && (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">New Shift</label>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={editState.newShiftCode === "D" ? "default" : "outline"}
                      onClick={() => setEditState({ ...editState, newShiftCode: "D" })}
                    >
                      Day
                    </Button>
                    <Button
                      size="sm"
                      variant={editState.newShiftCode === "N" ? "default" : "outline"}
                      onClick={() => setEditState({ ...editState, newShiftCode: "N" })}
                    >
                      Night
                    </Button>
                  </div>
                </div>
                <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Swapping..." : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditState({ ...editState, action: null })}>
                  Back
                </Button>
              </div>
            )}

            {/* Add Note form */}
            {editState.action === "add_note" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground block mb-1">Note</label>
                  <textarea
                    className="text-sm border rounded px-2 py-1 w-full"
                    rows={2}
                    placeholder="Add a note for this shift..."
                    value={editState.note}
                    onChange={(e) => setEditState({ ...editState, note: e.target.value })}
                  />
                </div>
                <Button size="sm" onClick={handleSubmit} disabled={submitting || isConfirmDisabled()}>
                  {submitting ? "Saving..." : "Save Note"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditState({ ...editState, action: null })}>
                  Back
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">July 2024 — Team Schedule</CardTitle>
          <p className="text-xs text-muted-foreground">Click any shift cell to edit. R, OFF, and H cells are read-only.</p>
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
                      const isClickable = CLICKABLE_CODES.has(code);
                      const isSelected =
                        editState?.employeeId === member.id && editState?.date === d;

                      return (
                        <td
                          key={d}
                          className={`px-0.5 py-1 text-center ${isToday ? "bg-primary/5" : ""} ${
                            isClickable ? "cursor-pointer hover:bg-muted/50" : ""
                          } ${isSelected ? "bg-amber-50" : ""}`}
                          onClick={() => isClickable && handleCellClick(member.id, d, code)}
                          title={entry?.notes || undefined}
                        >
                          {code && (
                            <span className="relative inline-block">
                              <span
                                className={`inline-block px-1 py-0.5 rounded text-[10px] font-medium leading-none ${SHIFT_COLORS[code] || "bg-gray-100"}`}
                              >
                                {code}
                              </span>
                              {entry?.isModified && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                              )}
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
        <div className="flex items-center gap-1">
          <span className="relative inline-block px-1.5 py-0.5 rounded font-medium bg-gray-100">
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
            &nbsp;&nbsp;
          </span>
          <span className="text-muted-foreground">Modified</span>
        </div>
      </div>
    </div>
  );
}
