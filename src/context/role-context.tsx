"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "employee" | "supervisor" | "payroll_admin";

interface RoleContextType {
  role: Role;
  employeeId: number;
  setRole: (role: Role) => void;
}

// Default employee IDs for each role in the demo
const defaultEmployeeIds: Record<Role, number> = {
  employee: 1, // Kyle M — IBEW shift worker
  supervisor: 10, // Mark D — Shift Supervisor
  payroll_admin: 15, // Sarah Chen — Payroll Manager
};

const defaultEmployeeNames: Record<Role, string> = {
  employee: "Kyle M",
  supervisor: "Mark D",
  payroll_admin: "Sarah Chen",
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("employee");

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        employeeId: defaultEmployeeIds[role],
        setRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}

export { defaultEmployeeIds, defaultEmployeeNames };
