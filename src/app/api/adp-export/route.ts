import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db/index";
import { employees, timesheets, timeEntries, auditLog } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// ADP pay code mapping
const ADP_CODE_MAP: Record<string, string> = {
  REG: "REG",
  OT_1_5: "OT15",
  OT_2_0: "OT20",
  VAC: "VAC",
  SICK: "SCK",
  FLOAT: "FLT",
  HOL: "HOL",
  COMP: "CMP",
  LBA: "LBA",
  TRAIN: "TRN",
  JURY: "JRY",
  BEREAVEMENT: "BRV",
  ADMIN: "ADM",
  LWOP: "LWP",
  FAM_SICK: "FSK",
};

// Demo ADP file numbers
const ADP_FILE_NUMBERS: Record<number, string> = {
  1: "NCPA-0001", 2: "NCPA-0002", 3: "NCPA-0003", 4: "NCPA-0004",
  5: "NCPA-0005", 6: "NCPA-0006", 7: "NCPA-0007", 8: "NCPA-0008",
  9: "NCPA-0009", 10: "NCPA-0010", 11: "NCPA-0011", 12: "NCPA-0012",
  13: "NCPA-0013", 14: "NCPA-0014", 15: "NCPA-0015", 16: "NCPA-0016",
  17: "NCPA-0017", 18: "NCPA-0018", 19: "NCPA-0019", 20: "NCPA-0020",
};

const COST_CENTERS: Record<string, string> = {
  lodi: "CC-100",
  roseville_hq: "CC-200",
  lake_county: "CC-300",
  murphys: "CC-400",
};

const PAY_PERIODS = [
  { start: "2024-06-01", end: "2024-06-15", label: "Jun 1 – Jun 15, 2024" },
  { start: "2024-06-16", end: "2024-06-30", label: "Jun 16 – Jun 30, 2024" },
  { start: "2024-07-01", end: "2024-07-14", label: "Jul 1 – Jul 14, 2024" },
  { start: "2024-07-15", end: "2024-07-28", label: "Jul 15 – Jul 28, 2024" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ppStart = searchParams.get("ppStart");
  const ppEnd = searchParams.get("ppEnd");

  if (!ppStart || !ppEnd) {
    return NextResponse.json({
      payPeriods: PAY_PERIODS,
      codeMapping: ADP_CODE_MAP,
    });
  }

  // Get approved/processed timesheets for this period
  const periodTimesheets = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.payPeriodStart, ppStart),
        eq(timesheets.payPeriodEnd, ppEnd)
      )
    );

  const approvedTs = periodTimesheets.filter(
    (t) => t.status === "approved" || t.status === "processed"
  );

  const allEmployees = await db.select().from(employees);

  // Build export rows
  const exportRows: Array<{
    employeeName: string;
    adpFileNumber: string;
    earnCode: string;
    internalCode: string;
    hours: number;
    costCenter: string;
  }> = [];

  let totalHours = 0;
  const hoursByCode: Record<string, number> = {};

  for (const ts of approvedTs) {
    const emp = allEmployees.find((e) => e.id === ts.employeeId);
    if (!emp) continue;

    const entries = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.timesheetId, ts.id));

    // Aggregate hours by pay code for this employee
    const empHoursByCode: Record<string, number> = {};
    for (const entry of entries) {
      empHoursByCode[entry.payCode] = (empHoursByCode[entry.payCode] || 0) + entry.hours;
    }

    for (const [code, hours] of Object.entries(empHoursByCode)) {
      const adpCode = ADP_CODE_MAP[code] || code;
      const roundedHours = Math.round(hours * 100) / 100;
      exportRows.push({
        employeeName: emp.name,
        adpFileNumber: ADP_FILE_NUMBERS[emp.id] || `NCPA-${String(emp.id).padStart(4, "0")}`,
        earnCode: adpCode,
        internalCode: code,
        hours: roundedHours,
        costCenter: COST_CENTERS[emp.location] || "CC-000",
      });
      totalHours += roundedHours;
      hoursByCode[adpCode] = (hoursByCode[adpCode] || 0) + roundedHours;
    }
  }

  // Sort by employee name, then earn code
  exportRows.sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.earnCode.localeCompare(b.earnCode));

  // Validation
  const allApproved = periodTimesheets.length > 0 && periodTimesheets.every(
    (t) => t.status === "approved" || t.status === "processed"
  );
  const notSubmitted = allEmployees.length - periodTimesheets.length;

  // Last export info from audit log
  const lastExport = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.action, "adp_export"))
    .orderBy(desc(auditLog.createdAt))
    .then((rows) => rows[0] || null);

  return NextResponse.json({
    payPeriods: PAY_PERIODS,
    codeMapping: ADP_CODE_MAP,
    preview: {
      rows: exportRows,
      totalHours: Math.round(totalHours * 100) / 100,
      hoursByCode: Object.entries(hoursByCode)
        .map(([code, hours]) => ({ code, hours: Math.round(hours * 100) / 100 }))
        .sort((a, b) => b.hours - a.hours),
      employeeCount: approvedTs.length,
      timesheetCount: approvedTs.length,
    },
    validation: {
      allApproved,
      totalTimesheets: periodTimesheets.length,
      approvedCount: approvedTs.length,
      notSubmitted,
      totalEmployees: allEmployees.length,
    },
    lastExport: lastExport
      ? { date: lastExport.createdAt, details: lastExport.newValue }
      : null,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body as { action: string };

  if (action === "export") {
    const { ppStart, ppEnd, adminId } = body as {
      ppStart: string;
      ppEnd: string;
      adminId: number;
    };
    const now = new Date().toISOString();

    // Mark approved timesheets as processed
    const approved = await db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.payPeriodStart, ppStart),
          eq(timesheets.payPeriodEnd, ppEnd),
          eq(timesheets.status, "approved")
        )
      );

    sqlite.transaction(() => {
      for (const ts of approved) {
        sqlite
          .prepare("UPDATE timesheets SET status = 'processed' WHERE id = ?")
          .run(ts.id);
      }

      sqlite
        .prepare(
          `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
           VALUES (?, 'adp_export', 'pay_period', NULL, ?, ?, ?)`
        )
        .run(
          adminId,
          JSON.stringify({ period: `${ppStart} to ${ppEnd}` }),
          JSON.stringify({ exportedCount: approved.length, exportedAt: now }),
          now
        );
    })();

    return NextResponse.json({ success: true, processedCount: approved.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
