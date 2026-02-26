"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LeaveRequest,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_COLORS,
} from "@/lib/leave-types";
import { X, ChevronDown, ChevronUp, FileText, Inbox } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

interface LeaveHistoryProps {
  requests: LeaveRequest[];
  employeeId: number;
  onCancelled: () => void;
}

export function LeaveHistory({ requests, employeeId, onCancelled }: LeaveHistoryProps) {
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const handleCancel = async (requestId: number) => {
    setCancellingId(requestId);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_request",
          requestId,
          employeeId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setConfirmCancelId(null);
        onCancelled();
      }
    } catch {
      // silently fail in demo
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Leave Request History</CardTitle>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All ({requests.length})</option>
            <option value="pending">Pending ({requests.filter((r) => r.status === "pending").length})</option>
            <option value="approved">Approved ({requests.filter((r) => r.status === "approved").length})</option>
            <option value="rejected">Rejected ({requests.filter((r) => r.status === "rejected").length})</option>
            <option value="cancelled">Cancelled ({requests.filter((r) => r.status === "cancelled").length})</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Inbox className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">No leave requests found</p>
            <p className="text-xs">
              {filter === "all" ? "Submit your first leave request to see it here." : `No ${filter} requests.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => {
              const colors = LEAVE_TYPE_COLORS[req.leaveType];
              const isExpanded = expandedId === req.id;

              return (
                <div
                  key={req.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Type badge */}
                    <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border} text-xs whitespace-nowrap`}>
                      {LEAVE_TYPE_LABELS[req.leaveType]}
                    </Badge>

                    {/* Dates */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        {formatDate(req.startDate)}
                        {req.startDate !== req.endDate && ` – ${formatDate(req.endDate)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {req.totalHours}h | Submitted {formatDateTime(req.submittedAt)}
                      </div>
                    </div>

                    {/* Status */}
                    <Badge variant="outline" className={`${STATUS_STYLES[req.status]} text-xs`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {req.status === "pending" && (
                        <>
                          {confirmCancelId === req.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancel(req.id)}
                                disabled={cancellingId === req.id}
                                className="h-7 text-xs"
                              >
                                {cancellingId === req.id ? "..." : "Confirm"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmCancelId(null)}
                                className="h-7 text-xs"
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmCancelId(req.id)}
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </>
                      )}

                      {(req.decisionNotes || req.decidedAt) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="h-7 w-7 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t bg-muted/30">
                      <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                        {req.decidedAt && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3" />
                            <span>Decided: {formatDateTime(req.decidedAt)}</span>
                          </div>
                        )}
                        {req.decisionNotes && (
                          <div className="mt-1 p-2 bg-background rounded border text-sm">
                            {req.decisionNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
