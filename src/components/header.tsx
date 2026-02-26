"use client";

import { useRouter } from "next/navigation";
import { useRole, defaultEmployeeNames, Role } from "@/context/role-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";

const roleLabels: Record<Role, string> = {
  employee: "Employee",
  supervisor: "Supervisor",
  payroll_admin: "Payroll Admin",
};

const roleBadgeVariants: Record<Role, "default" | "secondary" | "outline"> = {
  employee: "default",
  supervisor: "secondary",
  payroll_admin: "outline",
};

export function Header() {
  const { role } = useRole();
  const router = useRouter();
  const name = defaultEmployeeNames[role];
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4 gap-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm text-primary">NCPA</span>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Time & Attendance
        </span>
      </div>

      <div className="flex-1" />

      <Badge variant={roleBadgeVariants[role]}>{roleLabels[role]}</Badge>

      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium hidden sm:inline">{name}</span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/")}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Switch Role
      </Button>
    </header>
  );
}
