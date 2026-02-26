"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole, Role } from "@/context/role-context";
import { cn } from "@/lib/utils";
import {
  FileText,
  Calendar,
  PalmtreeIcon as PlaneTakeoff,
  Bell,
  LayoutDashboard,
  CheckSquare,
  CalendarClock,
  Users,
  DollarSign,
  ShieldCheck,
  BookOpen,
  BarChart3,
  FileOutput,
  ScrollText,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navByRole: Record<Role, NavItem[]> = {
  employee: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Timesheet", href: "/dashboard/timesheet", icon: FileText },
    { label: "My Schedule", href: "/dashboard/schedule", icon: Calendar },
    { label: "Leave", href: "/dashboard/leave", icon: PlaneTakeoff },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ],
  supervisor: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Team Dashboard", href: "/dashboard/team", icon: Users },
    { label: "Approvals", href: "/dashboard/approvals", icon: CheckSquare },
    { label: "Scheduling", href: "/dashboard/scheduling", icon: CalendarClock },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ],
  payroll_admin: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Pay Period", href: "/dashboard/pay-period", icon: DollarSign },
    { label: "Compliance", href: "/dashboard/compliance", icon: ShieldCheck },
    { label: "Pay Rules", href: "/dashboard/pay-rules", icon: BookOpen },
    { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
    { label: "ADP Export", href: "/dashboard/adp-export", icon: FileOutput },
    { label: "Audit Log", href: "/dashboard/audit-log", icon: ScrollText },
  ],
};

export function Sidebar() {
  const { role } = useRole();
  const pathname = usePathname();
  const items = navByRole[role];

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-slate-50/50 p-4">
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
