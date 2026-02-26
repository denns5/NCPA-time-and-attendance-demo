import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/index";
import { employees, timesheets, timeEntries, leaveRequests, leaveBalances } from "@/db/schema";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "summary";

  const allEmployees = await db.select().from(employees);
  const allTimesheets = await db.select().from(timesheets);
  const allEntries = await db.select().from(timeEntries);
  const allLeaveRequests = await db.select().from(leaveRequests);
  const allBalances = await db.select().from(leaveBalances);

  switch (type) {
    case "summary": {
      // Overall stats
      const totalTimesheets = allTimesheets.length;
      const approvedCount = allTimesheets.filter((t) => t.status === "approved" || t.status === "processed").length;
      const totalHours = allEntries.reduce((sum, e) => sum + e.hours, 0);
      const totalEmployees = allEmployees.length;

      // Hours by pay code
      const hoursByCode: Record<string, number> = {};
      for (const entry of allEntries) {
        hoursByCode[entry.payCode] = (hoursByCode[entry.payCode] || 0) + entry.hours;
      }

      return NextResponse.json({
        type: "summary",
        stats: {
          totalEmployees,
          totalTimesheets,
          approvedTimesheets: approvedCount,
          totalHours: Math.round(totalHours * 100) / 100,
        },
        hoursByCode: Object.entries(hoursByCode)
          .map(([code, hours]) => ({ code, hours: Math.round(hours * 100) / 100 }))
          .sort((a, b) => b.hours - a.hours),
      });
    }

    case "hours": {
      // Hours by employee
      const employeeHours = allEmployees.map((emp) => {
        const empTimesheets = allTimesheets.filter((t) => t.employeeId === emp.id);
        const tsIds = new Set(empTimesheets.map((t) => t.id));
        const empEntries = allEntries.filter((e) => tsIds.has(e.timesheetId));

        const byCode: Record<string, number> = {};
        let total = 0;
        for (const entry of empEntries) {
          byCode[entry.payCode] = (byCode[entry.payCode] || 0) + entry.hours;
          total += entry.hours;
        }

        return {
          id: emp.id,
          name: emp.name,
          employeeType: emp.employeeType,
          location: emp.location,
          reg: Math.round((byCode["REG"] || 0) * 100) / 100,
          ot15: Math.round((byCode["OT_1_5"] || 0) * 100) / 100,
          ot20: Math.round((byCode["OT_2_0"] || 0) * 100) / 100,
          vac: Math.round((byCode["VAC"] || 0) * 100) / 100,
          sick: Math.round((byCode["SICK"] || 0) * 100) / 100,
          other: Math.round((total - (byCode["REG"] || 0) - (byCode["OT_1_5"] || 0) - (byCode["OT_2_0"] || 0) - (byCode["VAC"] || 0) - (byCode["SICK"] || 0)) * 100) / 100,
          total: Math.round(total * 100) / 100,
        };
      }).filter((e) => e.total > 0);

      return NextResponse.json({ type: "hours", employees: employeeHours });
    }

    case "overtime": {
      // OT analysis by employee
      const otData = allEmployees.map((emp) => {
        const empTimesheets = allTimesheets.filter((t) => t.employeeId === emp.id);
        const tsIds = new Set(empTimesheets.map((t) => t.id));
        const empEntries = allEntries.filter((e) => tsIds.has(e.timesheetId));

        const ot15 = empEntries.filter((e) => e.payCode === "OT_1_5").reduce((sum, e) => sum + e.hours, 0);
        const ot20 = empEntries.filter((e) => e.payCode === "OT_2_0").reduce((sum, e) => sum + e.hours, 0);
        const reg = empEntries.filter((e) => e.payCode === "REG").reduce((sum, e) => sum + e.hours, 0);
        const totalOT = ot15 + ot20;

        return {
          id: emp.id,
          name: emp.name,
          employeeType: emp.employeeType,
          scheduleType: emp.scheduleType,
          reg: Math.round(reg * 100) / 100,
          ot15: Math.round(ot15 * 100) / 100,
          ot20: Math.round(ot20 * 100) / 100,
          totalOT: Math.round(totalOT * 100) / 100,
          otPercent: reg > 0 ? Math.round((totalOT / reg) * 100) : 0,
        };
      })
        .filter((e) => e.reg > 0 || e.totalOT > 0)
        .sort((a, b) => b.totalOT - a.totalOT);

      const totalOT15 = otData.reduce((sum, e) => sum + e.ot15, 0);
      const totalOT20 = otData.reduce((sum, e) => sum + e.ot20, 0);

      return NextResponse.json({
        type: "overtime",
        employees: otData,
        totals: {
          ot15: Math.round(totalOT15 * 100) / 100,
          ot20: Math.round(totalOT20 * 100) / 100,
          totalOT: Math.round((totalOT15 + totalOT20) * 100) / 100,
        },
      });
    }

    case "leave": {
      // Leave usage by employee
      const leaveData = allEmployees.map((emp) => {
        const empRequests = allLeaveRequests.filter(
          (r) => r.employeeId === emp.id && (r.status === "approved" || r.status === "pending")
        );
        const empBalances = allBalances.filter((b) => b.employeeId === emp.id);

        const usageByType: Record<string, number> = {};
        for (const req of empRequests) {
          usageByType[req.leaveType] = (usageByType[req.leaveType] || 0) + req.totalHours;
        }

        const balanceByType: Record<string, number> = {};
        for (const bal of empBalances) {
          balanceByType[bal.leaveType] = bal.balanceHours;
        }

        return {
          id: emp.id,
          name: emp.name,
          employeeType: emp.employeeType,
          vacUsed: Math.round((usageByType["vacation"] || 0) * 100) / 100,
          vacBalance: Math.round((balanceByType["vacation"] || 0) * 100) / 100,
          sickUsed: Math.round((usageByType["sick"] || 0) * 100) / 100,
          sickBalance: Math.round((balanceByType["sick"] || 0) * 100) / 100,
          otherUsed: Math.round(
            (Object.entries(usageByType)
              .filter(([k]) => k !== "vacation" && k !== "sick")
              .reduce((sum, [, v]) => sum + v, 0)) * 100
          ) / 100,
          pendingRequests: allLeaveRequests.filter(
            (r) => r.employeeId === emp.id && r.status === "pending"
          ).length,
        };
      }).filter((e) => e.vacUsed > 0 || e.sickUsed > 0 || e.otherUsed > 0 || e.vacBalance > 0);

      return NextResponse.json({ type: "leave", employees: leaveData });
    }

    default:
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }
}
