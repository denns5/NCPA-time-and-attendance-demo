"use client";

import { useEffect, useState } from "react";
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
  Loader2,
} from "lucide-react";

interface DashCard {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}

function buildCards(role: Role, data: Record<string, { value: string; description: string }>): DashCard[] {
  if (role === "employee") {
    return [
      { title: "Current Timesheet", value: data.timesheet.value, description: data.timesheet.description, icon: FileText },
      { title: "Next Shift", value: data.nextShift.value, description: data.nextShift.description, icon: Calendar },
      { title: "Leave Balance", value: data.leaveBalance.value, description: data.leaveBalance.description, icon: Clock },
      { title: "Pending Requests", value: data.pendingRequests.value, description: data.pendingRequests.description, icon: CheckSquare },
    ];
  }
  if (role === "supervisor") {
    return [
      { title: "Pending Approvals", value: data.pendingApprovals.value, description: data.pendingApprovals.description, icon: CheckSquare },
      { title: "Team On Shift", value: data.teamOnShift.value, description: data.teamOnShift.description, icon: Users },
      { title: "Coverage Gaps", value: data.coverageGaps.value, description: data.coverageGaps.description, icon: AlertTriangle },
      { title: "OT This Period", value: data.otThisPeriod.value, description: data.otThisPeriod.description, icon: Clock },
    ];
  }
  // payroll_admin
  return [
    { title: "Pay Period Status", value: data.payPeriodStatus.value, description: data.payPeriodStatus.description, icon: DollarSign },
    { title: "Compliance Alerts", value: data.complianceAlerts.value, description: data.complianceAlerts.description, icon: ShieldCheck },
    { title: "Active Pay Rules", value: data.activePayRules.value, description: data.activePayRules.description, icon: BarChart3 },
    { title: "Last ADP Export", value: data.lastAdpExport.value, description: data.lastAdpExport.description, icon: FileText },
  ];
}

export default function DashboardHome() {
  const { role, employeeId } = useRole();
  const name = defaultEmployeeNames[role];
  const [cards, setCards] = useState<DashCard[] | null>(null);

  useEffect(() => {
    setCards(null);
    fetch(`/api/dashboard?role=${role}&employeeId=${employeeId}`)
      .then((res) => res.json())
      .then((data) => setCards(buildCards(role, data)))
      .catch(() => setCards([]));
  }, [role, employeeId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          Here&apos;s your overview for today.
        </p>
      </div>

      {cards === null ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading dashboard...
        </div>
      ) : (
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
      )}
    </div>
  );
}
