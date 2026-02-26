"use client";

import { useRouter } from "next/navigation";
import { useRole, Role } from "@/context/role-context";
import { RoleCard } from "@/components/role-card";
import { User, Users, ShieldCheck } from "lucide-react";

const roles = [
  {
    role: "employee" as Role,
    title: "Employee",
    description: "View and submit your timesheets, check schedules, and manage leave requests.",
    capabilities: [
      "View & submit timesheets",
      "Check shift schedule",
      "Request time off",
      "View leave balances",
      "Review notifications",
    ],
    icon: User,
  },
  {
    role: "supervisor" as Role,
    title: "Supervisor",
    description: "Manage your team's timesheets, approve leave, and oversee shift scheduling.",
    capabilities: [
      "Approve/reject timesheets",
      "Manage team schedules",
      "Review leave requests",
      "Monitor OT & coverage",
      "Team dashboard overview",
    ],
    icon: Users,
  },
  {
    role: "payroll_admin" as Role,
    title: "Payroll Admin",
    description: "Process payroll, manage pay rules, run compliance reports, and export to ADP.",
    capabilities: [
      "Process pay periods",
      "Manage pay rules engine",
      "Run compliance reports",
      "Export to ADP",
      "Full audit log access",
    ],
    icon: ShieldCheck,
  },
];

export default function Home() {
  const router = useRouter();
  const { setRole } = useRole();

  const handleSelectRole = (role: Role) => {
    setRole(role);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            Northern California Power Agency
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Time & Attendance System
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Select a role to explore the demo. Each role provides a tailored experience
            for managing time, attendance, and payroll across NCPA&apos;s operations.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((r) => (
            <RoleCard key={r.role} {...r} onSelect={handleSelectRole} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>Demo environment &mdash; 4 locations &bull; 2 unions (IBEW 1245, HEA) &bull; 180 employees</p>
        </div>
      </div>
    </div>
  );
}
