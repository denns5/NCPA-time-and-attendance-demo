"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { TimesheetData, TimesheetRow, PayCode, TimesheetStatus } from "@/lib/timesheet-types";
import { TimesheetGrid } from "@/components/timesheet/timesheet-grid";
import { TimesheetHeader } from "@/components/timesheet/timesheet-header";
import { TimesheetValidation } from "@/components/timesheet/timesheet-validation";
import { buildRowsFromData } from "@/lib/timesheet-builder";
import { calculateOvertime, ScheduleType } from "@/lib/overtime";
import { Loader2 } from "lucide-react";

export default function TimesheetPage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<TimesheetData | null>(null);
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPP, setSelectedPP] = useState<{ start: string; end: string } | null>(null);
  const [status, setStatus] = useState<TimesheetStatus>("new");
  const [showValidation, setShowValidation] = useState(false);
  const [overrideChecked, setOverrideChecked] = useState(false);
  const [overrideNote, setOverrideNote] = useState("");
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(
    async (ppStart?: string, ppEnd?: string) => {
      setLoading(true);
      setSaveMessage(null);
      try {
        const params = new URLSearchParams({ employeeId: String(employeeId) });
        if (ppStart) params.set("ppStart", ppStart);
        if (ppEnd) params.set("ppEnd", ppEnd);

        const res = await fetch(`/api/timesheet?${params}`);
        const json: TimesheetData = await res.json();
        setData(json);
        setSelectedPP(json.currentPayPeriod);
        setStatus(json.timesheet?.status || "new");

        // Build rows from schedule + existing entries
        const builtRows = buildRowsFromData(json);
        setRows(builtRows);
      } catch {
        console.error("Failed to load timesheet data");
      } finally {
        setLoading(false);
      }
    },
    [employeeId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePPChange = (ppStart: string, ppEnd: string) => {
    setShowValidation(false);
    setOverrideChecked(false);
    setOverrideNote("");
    fetchData(ppStart, ppEnd);
  };

  const handleCellChange = (rowIndex: number, date: string, value: number) => {
    setRows((prev) => {
      const next = prev.map((r, i) => {
        if (i !== rowIndex) return r;
        return {
          ...r,
          hours: { ...r.hours, [date]: value },
          isAutoPopulated: { ...r.isAutoPopulated, [date]: false },
        };
      });
      return recalcOT(next);
    });
    setSaveMessage(null);
  };

  const handleNoteChange = (rowIndex: number, date: string, note: string) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        return { ...r, notes: { ...r.notes, [date]: note } };
      })
    );
  };

  const handleProjectChange = (rowIndex: number, field: "projectCode" | "costCode", value: string) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        return { ...r, [field]: value };
      })
    );
  };

  const handleAddRow = (payCode: PayCode) => {
    // Don't add duplicates
    if (rows.some((r) => r.payCode === payCode)) return;
    const dates = getDates();
    const newRow: TimesheetRow = {
      payCode,
      hours: Object.fromEntries(dates.map((d) => [d, 0])),
      notes: {},
      projectCode: "",
      costCode: "",
      isAutoPopulated: {},
      isAutoCalculated: false,
    };
    setRows((prev) => {
      // Insert before OT rows
      const otIndex = prev.findIndex((r) => r.payCode === "OT_1_5" || r.payCode === "OT_2_0");
      if (otIndex === -1) return [...prev, newRow];
      const next = [...prev];
      next.splice(otIndex, 0, newRow);
      return next;
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      return recalcOT(next);
    });
  };

  const recalcOT = (currentRows: TimesheetRow[]): TimesheetRow[] => {
    if (!data) return currentRows;
    const dates = getDates();
    const scheduleType = data.employee.scheduleType as ScheduleType;

    // Sum worked hours per day (REG + HOL worked + coverage)
    const dayHours = dates.map((date) => {
      let total = 0;
      for (const row of currentRows) {
        if (row.payCode === "OT_1_5" || row.payCode === "OT_2_0") continue;
        if (row.payCode === "REG") {
          total += row.hours[date] || 0;
        }
      }
      const dow = new Date(date + "T12:00:00").getDay();
      const isShortFriday = scheduleType === "9_80" && dow === 5;
      return { date, regular: total, isShortFriday };
    });

    const otResults = calculateOvertime(scheduleType, dayHours);

    // Build OT rows
    const ot15Hours: Record<string, number> = {};
    const ot20Hours: Record<string, number> = {};
    let hasOT15 = false;
    let hasOT20 = false;
    for (const r of otResults) {
      if (r.ot15 > 0) { ot15Hours[r.date] = r.ot15; hasOT15 = true; }
      if (r.ot20 > 0) { ot20Hours[r.date] = r.ot20; hasOT20 = true; }
    }

    // Remove existing OT rows
    const withoutOT = currentRows.filter(
      (r) => r.payCode !== "OT_1_5" && r.payCode !== "OT_2_0"
    );

    // Adjust REG hours: subtract OT from the regular row
    const adjusted = withoutOT.map((row) => {
      if (row.payCode !== "REG") return row;
      const newHours = { ...row.hours };
      for (const date of dates) {
        const totalWorked = dayHours.find((d) => d.date === date)?.regular || 0;
        const ot15 = ot15Hours[date] || 0;
        const ot20 = ot20Hours[date] || 0;
        const regPortion = totalWorked - ot15 - ot20;
        if (totalWorked > 0 && (ot15 > 0 || ot20 > 0)) {
          newHours[date] = Math.max(0, regPortion);
        }
      }
      return { ...row, hours: newHours };
    });

    // Add OT rows at the end
    if (hasOT15) {
      adjusted.push({
        payCode: "OT_1_5",
        hours: Object.fromEntries(dates.map((d) => [d, ot15Hours[d] || 0])),
        notes: {},
        projectCode: "",
        costCode: "",
        isAutoPopulated: {},
        isAutoCalculated: true,
      });
    }
    if (hasOT20) {
      adjusted.push({
        payCode: "OT_2_0",
        hours: Object.fromEntries(dates.map((d) => [d, ot20Hours[d] || 0])),
        notes: {},
        projectCode: "",
        costCode: "",
        isAutoPopulated: {},
        isAutoCalculated: true,
      });
    }

    return adjusted;
  };

  const getDates = (): string[] => {
    if (!selectedPP) return [];
    const dates: string[] = [];
    const start = new Date(selectedPP.start + "T12:00:00");
    const end = new Date(selectedPP.end + "T12:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  const handleSave = async (action: "save" | "submit") => {
    if (!data || !selectedPP) return;
    setSaving(true);
    setSaveMessage(null);

    // Flatten rows into entries
    const entries: Array<{
      date: string;
      payCode: string;
      hours: number;
      projectCode?: string;
      costCode?: string;
      notes?: string;
      isAutoCalculated?: boolean;
    }> = [];

    for (const row of rows) {
      const dates = getDates();
      for (const date of dates) {
        const hours = row.hours[date] || 0;
        if (hours > 0) {
          entries.push({
            date,
            payCode: row.payCode,
            hours,
            projectCode: row.projectCode || undefined,
            costCode: row.costCode || undefined,
            notes: row.notes[date] || undefined,
            isAutoCalculated: row.isAutoCalculated,
          });
        }
      }
    }

    try {
      const res = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: data.employee.id,
          ppStart: selectedPP.start,
          ppEnd: selectedPP.end,
          action,
          entries,
          overrideNote: overrideChecked ? overrideNote : undefined,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setStatus(result.status);
        setSaveMessage({
          type: "success",
          text: action === "submit" ? "Timesheet submitted for approval." : "Draft saved.",
        });
        if (action === "submit") {
          setShowValidation(false);
        }
      } else {
        setSaveMessage({ type: "error", text: result.error || "Failed to save." });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const isReadOnly =
    status === "submitted" || status === "approved" || status === "processed";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-destructive">Failed to load timesheet data.</div>;
  }

  const dates = getDates();

  return (
    <div className="space-y-4">
      <TimesheetHeader
        employee={data.employee}
        status={status}
        timesheet={data.timesheet}
        payPeriods={data.payPeriods}
        currentPayPeriod={selectedPP!}
        onPayPeriodChange={handlePPChange}
      />

      <TimesheetGrid
        rows={rows}
        dates={dates}
        schedule={data.schedule}
        leaveBalances={data.leaveBalances}
        scheduleType={data.employee.scheduleType}
        isReadOnly={isReadOnly}
        onCellChange={handleCellChange}
        onNoteChange={handleNoteChange}
        onProjectChange={handleProjectChange}
        onAddRow={handleAddRow}
        onRemoveRow={handleRemoveRow}
      />

      <TimesheetValidation
        rows={rows}
        dates={dates}
        leaveBalances={data.leaveBalances}
        status={status}
        isReadOnly={isReadOnly}
        showValidation={showValidation}
        overrideChecked={overrideChecked}
        overrideNote={overrideNote}
        saving={saving}
        saveMessage={saveMessage}
        onShowValidation={setShowValidation}
        onOverrideChange={setOverrideChecked}
        onOverrideNoteChange={setOverrideNote}
        onSave={() => handleSave("save")}
        onSubmit={() => handleSave("submit")}
      />
    </div>
  );
}
