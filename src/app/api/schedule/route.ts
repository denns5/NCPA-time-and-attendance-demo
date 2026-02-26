import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { employees, schedules } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const employeeId = Number(searchParams.get("employeeId"));

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  const employee = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .then((rows) => rows[0]);

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Fetch all July 2024 schedules
  const scheduleEntries = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.employeeId, employeeId),
        gte(schedules.date, "2024-07-01"),
        lte(schedules.date, "2024-07-31")
      )
    );

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      employeeType: employee.employeeType,
      scheduleType: employee.scheduleType,
      location: employee.location,
      department: employee.department,
      jobClassification: employee.jobClassification,
    },
    schedules: scheduleEntries,
    month: "2024-07",
  });
}
