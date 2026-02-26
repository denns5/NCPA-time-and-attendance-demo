"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Clock, AlertTriangle, CalendarDays } from "lucide-react";

type TeamMember = {
  id: number;
  name: string;
  employeeType: string;
  scheduleType: string;
  location: string;
  jobClassification: string;
  todayShift: string;
  todayStart: string | null;
  todayEnd: string | null;
  timesheetStatus: string;
};

type TeamData = {
  team: TeamMember[];
  stats: {
    onShift: number;
    pendingApprovals: number;
    coverageGaps: number;
    teamSize: number;
  };
  pendingLeave: Array<{
    id: number;
    employeeId: number;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalHours: number;
  }>;
  coverageGaps: Array<{
    date: string;
    employeeId: number;
    employeeName: string;
  }>;
};

const SHIFT_COLORS: Record<string, string> = {
  D: "bg-blue-100 text-blue-800",
  N: "bg-indigo-100 text-indigo-800",
  R: "bg-gray-100 text-gray-600",
  OFF: "bg-gray-100 text-gray-600",
  C: "bg-amber-100 text-amber-800",
  H: "bg-red-100 text-red-800",
  X: "bg-red-50 text-red-600 border border-red-300",
};

const TS_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  processed: "bg-purple-100 text-purple-800",
};

export default function TeamPage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/team?supervisorId=${employeeId}`);
      const json: TeamData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load team data");
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
    return <div className="text-destructive">Failed to load team data.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Team Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Overview of your team&apos;s schedules, timesheets, and pending items.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.onShift}</p>
                <p className="text-xs text-muted-foreground">On Shift Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.pendingApprovals}</p>
                <p className="text-xs text-muted-foreground">Pending Approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.coverageGaps}</p>
                <p className="text-xs text-muted-foreground">Coverage Gaps</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CalendarDays className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.teamSize}</p>
                <p className="text-xs text-muted-foreground">Team Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Roster — July 15, 2024</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Today&apos;s Shift</th>
                  <th className="py-2 pr-4 font-medium">Schedule Type</th>
                  <th className="py-2 pr-4 font-medium">Classification</th>
                  <th className="py-2 font-medium">Timesheet Status</th>
                </tr>
              </thead>
              <tbody>
                {data.team.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{member.name}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${SHIFT_COLORS[member.todayShift] || "bg-gray-100 text-gray-600"}`}>
                        {member.todayShift}
                      </span>
                      {member.todayStart && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {member.todayStart}–{member.todayEnd}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {member.scheduleType === "12_hour_rotating" ? "12-Hr Rotating" :
                       member.scheduleType === "9_80" ? "9/80" :
                       member.scheduleType === "4_10" ? "4/10" : "8/80"}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{member.jobClassification}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TS_STATUS_COLORS[member.timesheetStatus] || "bg-gray-100 text-gray-600"}`}>
                        {member.timesheetStatus === "not_started" ? "Not Started" : member.timesheetStatus.charAt(0).toUpperCase() + member.timesheetStatus.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Alerts */}
      {data.coverageGaps.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Coverage Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.coverageGaps.map((gap, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                  <span>
                    <span className="font-medium">{gap.employeeName}</span> — needs coverage
                  </span>
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    {new Date(gap.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Badge>
                </div>
              ))}
            </div>
            <a href="/dashboard/scheduling" className="inline-block mt-3 text-sm text-primary hover:underline">
              Manage coverage →
            </a>
          </CardContent>
        </Card>
      )}

      {/* Pending Leave */}
      {data.pendingLeave.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="text-lg">Pending Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.pendingLeave.map((lr) => (
                <div key={lr.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded text-sm">
                  <span>
                    <span className="font-medium">{lr.employeeName}</span> — {lr.leaveType} ({lr.totalHours}h)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lr.startDate} to {lr.endDate}
                  </span>
                </div>
              ))}
            </div>
            <a href="/dashboard/approvals" className="inline-block mt-3 text-sm text-primary hover:underline">
              Review approvals →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
