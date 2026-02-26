"use client";

import { useRole, defaultEmployeeNames, Role } from "@/context/role-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  FileText,
  Calendar,
  Clock,
  CheckSquare,
  Users,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

interface DashCard {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}

const cardsByRole: Record<Role, DashCard[]> = {
  employee: [
    { title: "Current Timesheet", value: "Draft", description: "Pay period 7/16 - 7/31", icon: FileText },
    { title: "Next Shift", value: "Day Shift", description: "Tomorrow, 06:00 - 18:00", icon: Calendar },
    { title: "Leave Balance", value: "120 hrs", description: "Vacation available", icon: Clock },
    { title: "Pending Requests", value: "1", description: "Vacation 7/22 - 7/25", icon: CheckSquare },
  ],
  supervisor: [
    { title: "Pending Approvals", value: "5", description: "2 timesheets, 3 leave requests", icon: CheckSquare },
    { title: "Team On Shift", value: "4", description: "Day shift — Lodi Energy Center", icon: Users },
    { title: "Coverage Gaps", value: "1", description: "7/26 night shift needs coverage", icon: AlertTriangle },
    { title: "OT This Period", value: "36 hrs", description: "Ryan D — coverage assignments", icon: Clock },
  ],
  payroll_admin: [
    { title: "Pay Period Status", value: "Open", description: "7/1 - 7/15 — 3 pending timesheets", icon: DollarSign },
    { title: "Compliance Alerts", value: "2", description: "Rest period violations flagged", icon: ShieldCheck },
    { title: "Active Pay Rules", value: "133", description: "All rules active", icon: BarChart3 },
    { title: "Last ADP Export", value: "6/30", description: "26 records exported", icon: FileText },
  ],
};

export default function DashboardHome() {
  const { role } = useRole();
  const name = defaultEmployeeNames[role];
  const cards = cardsByRole[role];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          Here&apos;s your overview for today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
