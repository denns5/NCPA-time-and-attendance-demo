"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  TimesheetRow,
  PayCode,
  PAY_CODE_LABELS,
  ADDABLE_LEAVE_CODES,
  ScheduleEntry,
  LeaveBalance,
  PAY_CODE_TO_BALANCE,
} from "@/lib/timesheet-types";
import {
  MessageSquare,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateHeader(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    day: DAY_NAMES[d.getDay()],
    date: `${d.getMonth() + 1}/${d.getDate()}`,
  };
}

function roundToQuarter(val: number): number {
  return Math.round(val * 4) / 4;
}

interface TimesheetGridProps {
  rows: TimesheetRow[];
  dates: string[];
  schedule: ScheduleEntry[];
  leaveBalances: LeaveBalance[];
  scheduleType: string;
  isReadOnly: boolean;
  onCellChange: (rowIndex: number, date: string, value: number) => void;
  onNoteChange: (rowIndex: number, date: string, note: string) => void;
  onProjectChange: (
    rowIndex: number,
    field: "projectCode" | "costCode",
    value: string
  ) => void;
  onAddRow: (payCode: PayCode) => void;
  onRemoveRow: (rowIndex: number) => void;
}

export function TimesheetGrid({
  rows,
  dates,
  schedule,
  leaveBalances,
  scheduleType,
  isReadOnly,
  onCellChange,
  onNoteChange,
  onProjectChange,
  onAddRow,
  onRemoveRow,
}: TimesheetGridProps) {
  const [noteCell, setNoteCell] = useState<{
    row: number;
    date: string;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [expandedCodes, setExpandedCodes] = useState<Set<number>>(new Set());
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const scheduleMap = new Map(schedule.map((s) => [s.date, s]));
  const balanceMap = new Map(
    leaveBalances.map((b) => [b.leaveType, b])
  );

  // Focus note textarea when opened
  useEffect(() => {
    if (noteCell && noteRef.current) {
      noteRef.current.focus();
    }
  }, [noteCell]);

  // Column totals per date
  const colTotals: Record<string, number> = {};
  for (const date of dates) {
    colTotals[date] = rows.reduce(
      (sum, row) => sum + (row.hours[date] || 0),
      0
    );
  }

  // Row total
  const rowTotal = (row: TimesheetRow): number =>
    dates.reduce((sum, d) => sum + (row.hours[d] || 0), 0);

  // Grand total
  const grandTotal = dates.reduce((sum, d) => sum + colTotals[d], 0);

  // Weekly totals
  const week1Total = dates
    .slice(0, 7)
    .reduce((sum, d) => sum + colTotals[d], 0);
  const week2Total = dates
    .slice(7, 14)
    .reduce((sum, d) => sum + colTotals[d], 0);

  // Codes already in the grid
  const usedCodes = new Set(rows.map((r) => r.payCode));

  // Available leave codes to add
  const availableCodes = ADDABLE_LEAVE_CODES.filter(
    (code) => !usedCodes.has(code)
  );

  const isShiftWorker = scheduleType === "12_hour_rotating";

  // Filter out LBA for non-shift workers
  const filteredAvailableCodes = availableCodes.filter((code) => {
    if (code === "LBA" && !isShiftWorker) return false;
    return true;
  });

  const openNote = (rowIdx: number, date: string) => {
    const existing = rows[rowIdx]?.notes[date] || "";
    setNoteText(existing);
    setNoteCell({ row: rowIdx, date });
  };

  const saveNote = () => {
    if (noteCell) {
      onNoteChange(noteCell.row, noteCell.date, noteText);
      setNoteCell(null);
    }
  };

  const toggleProjectExpand = (rowIdx: number) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(rowIdx)) next.delete(rowIdx);
      else next.add(rowIdx);
      return next;
    });
  };

  return (
    <div className="relative">
      {/* Scrollable grid wrapper */}
      <div className="overflow-x-auto border rounded-lg bg-background">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            {/* Week labels */}
            <tr className="bg-muted/30">
              <th className="sticky left-0 z-10 bg-muted/30 w-40 px-2 py-1" />
              <th
                colSpan={7}
                className="text-center text-xs font-medium text-muted-foreground border-b border-r py-1"
              >
                Week 1
              </th>
              <th
                colSpan={7}
                className="text-center text-xs font-medium text-muted-foreground border-b py-1"
              >
                Week 2
              </th>
              <th className="w-16 border-b px-2 py-1" />
            </tr>
            {/* Day/date headers */}
            <tr className="bg-muted/50">
              <th className="sticky left-0 z-10 bg-muted/50 text-left px-2 py-2 font-semibold text-xs uppercase tracking-wider">
                Pay Code
              </th>
              {dates.map((date, i) => {
                const { day, date: dateNum } = formatDateHeader(date);
                const sched = scheduleMap.get(date);
                const isWeekend =
                  new Date(date + "T12:00:00").getDay() === 0 ||
                  new Date(date + "T12:00:00").getDay() === 6;
                const isHoliday = sched?.shiftCode === "H";
                return (
                  <th
                    key={date}
                    className={cn(
                      "text-center px-1 py-2 font-medium text-xs w-16 min-w-[60px]",
                      i === 6 && "border-r",
                      isWeekend && !isShiftWorker && "bg-muted/80",
                      isHoliday && "bg-amber-50"
                    )}
                  >
                    <div className={cn(isWeekend && !isShiftWorker && "text-muted-foreground")}>
                      {day}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {dateNum}
                    </div>
                    {sched && isShiftWorker && (
                      <div
                        className={cn(
                          "text-[10px] font-bold mt-0.5",
                          sched.shiftCode === "D" && "text-amber-600",
                          sched.shiftCode === "N" && "text-indigo-600",
                          sched.shiftCode === "R" && "text-slate-400",
                          sched.shiftCode === "C" && "text-emerald-600",
                          sched.shiftCode === "H" && "text-red-500",
                          sched.shiftCode === "X" && "text-orange-500"
                        )}
                      >
                        {sched.shiftCode}
                      </div>
                    )}
                  </th>
                );
              })}
              <th className="text-center px-2 py-2 font-semibold text-xs uppercase tracking-wider w-16">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const isOTRow = row.isAutoCalculated;
              const isRemovable =
                !isReadOnly &&
                !isOTRow &&
                row.payCode !== "REG" &&
                row.payCode !== "HOL";
              const balanceType = PAY_CODE_TO_BALANCE[row.payCode];
              const balance = balanceType
                ? balanceMap.get(balanceType)
                : null;
              const total = rowTotal(row);
              const isExpanded = expandedCodes.has(rowIdx);

              return (
                <tr
                  key={row.payCode}
                  className={cn(
                    "border-t group",
                    isOTRow && "bg-orange-50/50"
                  )}
                >
                  {/* Row label */}
                  <td className="sticky left-0 z-10 bg-background px-2 py-1.5 font-medium text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {!isReadOnly && !isOTRow && row.payCode !== "REG" && row.payCode !== "HOL" && (
                        <button
                          onClick={() => toggleProjectExpand(rowIdx)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Project/cost code"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      )}
                      <span
                        className={cn(
                          isOTRow && "text-orange-700 font-semibold"
                        )}
                      >
                        {PAY_CODE_LABELS[row.payCode] || row.payCode}
                      </span>
                      {isOTRow && (
                        <span className="text-[10px] text-orange-500 ml-1">
                          auto
                        </span>
                      )}
                      {balance && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({balance.balanceHours}h avail)
                        </span>
                      )}
                      {isRemovable && (
                        <button
                          onClick={() => onRemoveRow(rowIdx)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove row"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {isExpanded && !isReadOnly && (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="Project"
                          value={row.projectCode}
                          onChange={(e) =>
                            onProjectChange(
                              rowIdx,
                              "projectCode",
                              e.target.value
                            )
                          }
                          className="w-20 h-6 px-1 text-[11px] border rounded bg-background"
                        />
                        <input
                          type="text"
                          placeholder="Cost"
                          value={row.costCode}
                          onChange={(e) =>
                            onProjectChange(
                              rowIdx,
                              "costCode",
                              e.target.value
                            )
                          }
                          className="w-20 h-6 px-1 text-[11px] border rounded bg-background"
                        />
                      </div>
                    )}
                  </td>

                  {/* Hour cells */}
                  {dates.map((date, colIdx) => {
                    const value = row.hours[date] || 0;
                    const hasNote = !!row.notes[date];
                    const isAuto = row.isAutoPopulated[date];
                    const sched = scheduleMap.get(date);
                    const isOff =
                      !isShiftWorker &&
                      (new Date(date + "T12:00:00").getDay() === 0 ||
                        new Date(date + "T12:00:00").getDay() === 6);
                    const isHoliday = sched?.shiftCode === "H";

                    return (
                      <td
                        key={date}
                        className={cn(
                          "text-center px-0.5 py-1 relative",
                          colIdx === 6 && "border-r",
                          isAuto && !isOTRow && "bg-blue-50/60",
                          isOff && !isShiftWorker && "bg-muted/40",
                          isHoliday && "bg-amber-50/60",
                          isOTRow && value > 0 && "bg-orange-50"
                        )}
                      >
                        {isOTRow || isReadOnly ? (
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              value === 0
                                ? "text-muted-foreground/30"
                                : isOTRow
                                  ? "font-semibold text-orange-700"
                                  : "font-medium"
                            )}
                          >
                            {value > 0 ? value.toFixed(2) : ""}
                          </span>
                        ) : (
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              max={24}
                              step={0.25}
                              value={value || ""}
                              onChange={(e) => {
                                const raw = parseFloat(e.target.value);
                                const rounded = isNaN(raw)
                                  ? 0
                                  : roundToQuarter(Math.max(0, Math.min(24, raw)));
                                onCellChange(rowIdx, date, rounded);
                              }}
                              className={cn(
                                "w-full h-7 text-center text-xs tabular-nums border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-primary/30 rounded",
                                value === 0 && "text-muted-foreground/30",
                                isAuto && "text-blue-800"
                              )}
                              placeholder=""
                            />
                            {/* Note indicator */}
                            {hasNote && (
                              <button
                                onClick={() => openNote(rowIdx, date)}
                                className="absolute -top-0.5 -right-0.5 text-amber-500"
                                title={row.notes[date]}
                              >
                                <MessageSquare className="h-2.5 w-2.5 fill-current" />
                              </button>
                            )}
                            {!hasNote && value > 0 && !isAuto && (
                              <button
                                onClick={() => openNote(rowIdx, date)}
                                className="absolute -top-0.5 -right-0.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-muted-foreground transition-opacity"
                                title="Add note"
                              >
                                <MessageSquare className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Row total */}
                  <td className="text-center px-2 py-1 font-semibold text-xs tabular-nums bg-muted/20">
                    {total > 0 ? total.toFixed(2) : ""}
                  </td>
                </tr>
              );
            })}

            {/* Column totals row */}
            <tr className="border-t-2 border-foreground/20 bg-muted/30 font-semibold">
              <td className="sticky left-0 z-10 bg-muted/30 px-2 py-2 text-xs uppercase tracking-wider">
                Daily Total
              </td>
              {dates.map((date, colIdx) => (
                <td
                  key={date}
                  className={cn(
                    "text-center px-1 py-2 text-xs tabular-nums",
                    colIdx === 6 && "border-r",
                    colTotals[date] > 0 && "text-foreground",
                    colTotals[date] === 0 && "text-muted-foreground/40"
                  )}
                >
                  {colTotals[date] > 0 ? colTotals[date].toFixed(2) : ""}
                </td>
              ))}
              <td className="text-center px-2 py-2 text-xs tabular-nums font-bold">
                {grandTotal.toFixed(2)}
              </td>
            </tr>

            {/* Weekly summary row */}
            <tr className="bg-muted/20">
              <td className="sticky left-0 z-10 bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
                Weekly Total
              </td>
              <td
                colSpan={7}
                className="text-center py-1.5 text-xs tabular-nums font-medium border-r"
              >
                {week1Total.toFixed(2)}
              </td>
              <td
                colSpan={7}
                className="text-center py-1.5 text-xs tabular-nums font-medium"
              >
                {week2Total.toFixed(2)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      {!isReadOnly && filteredAvailableCodes.length > 0 && (
        <div className="mt-2 relative">
          <button
            onClick={() => setShowAddRow(!showAddRow)}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Leave / Pay Code Row
          </button>
          {showAddRow && (
            <div className="absolute top-8 left-0 z-20 bg-background border rounded-md shadow-lg py-1 min-w-[240px]">
              {filteredAvailableCodes.map((code) => {
                const balanceType = PAY_CODE_TO_BALANCE[code];
                const bal = balanceType
                  ? balanceMap.get(balanceType)
                  : null;
                return (
                  <button
                    key={code}
                    onClick={() => {
                      onAddRow(code);
                      setShowAddRow(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center justify-between"
                  >
                    <span>{PAY_CODE_LABELS[code]}</span>
                    {bal && (
                      <span className="text-xs text-muted-foreground">
                        {bal.balanceHours}h available
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-blue-50 border border-blue-200" />
          Auto-populated from schedule
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-orange-50 border border-orange-200" />
          Auto-calculated OT
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-amber-50 border border-amber-200" />
          Holiday
        </span>
        {isShiftWorker && (
          <>
            <span>
              <span className="font-bold text-amber-600">D</span>=Day{" "}
              <span className="font-bold text-indigo-600">N</span>=Night{" "}
              <span className="font-bold text-slate-400">R</span>=Relief{" "}
              <span className="font-bold text-emerald-600">C</span>=Coverage{" "}
              <span className="font-bold text-red-500">H</span>=Holiday
            </span>
          </>
        )}
      </div>

      {/* Note editor popup */}
      {noteCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-background border rounded-lg shadow-xl p-4 w-80">
            <h3 className="font-semibold text-sm mb-2">
              Note for{" "}
              {formatDateHeader(noteCell.date).date} —{" "}
              {PAY_CODE_LABELS[rows[noteCell.row]?.payCode]}
            </h3>
            <textarea
              ref={noteRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              className="w-full border rounded-md p-2 text-sm resize-none focus:ring-1 focus:ring-primary/30 focus:outline-none"
              placeholder="Enter note..."
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setNoteCell(null)}
                className="px-3 py-1.5 text-xs rounded-md border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
