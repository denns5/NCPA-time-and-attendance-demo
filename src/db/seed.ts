import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "ncpa-demo.db");

// Delete existing database for clean seed
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Create tables
// ---------------------------------------------------------------------------
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    employee_type TEXT NOT NULL,
    schedule_type TEXT NOT NULL,
    location TEXT NOT NULL,
    department TEXT NOT NULL,
    job_classification TEXT NOT NULL,
    hire_date TEXT NOT NULL,
    supervisor_id INTEGER REFERENCES employees(id),
    is_supervisor INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    date TEXT NOT NULL,
    shift_code TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    is_modified INTEGER NOT NULL DEFAULT 0,
    modified_by INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    pay_period_start TEXT NOT NULL,
    pay_period_end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    submitted_at TEXT,
    approved_at TEXT,
    approved_by INTEGER,
    rejection_reason TEXT
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timesheet_id INTEGER NOT NULL REFERENCES timesheets(id),
    date TEXT NOT NULL,
    pay_code TEXT NOT NULL,
    hours REAL NOT NULL,
    project_code TEXT,
    cost_code TEXT,
    notes TEXT,
    is_auto_calculated INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS leave_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    leave_type TEXT NOT NULL,
    balance_hours REAL NOT NULL DEFAULT 0,
    accrual_rate_per_period REAL NOT NULL DEFAULT 0,
    cap_hours REAL,
    last_accrual_date TEXT
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    leave_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_hours REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approver_id INTEGER REFERENCES employees(id),
    submitted_at TEXT NOT NULL,
    decided_at TEXT,
    decision_notes TEXT
  );

  CREATE TABLE IF NOT EXISTS pay_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    employee_group TEXT NOT NULL,
    schedule_type TEXT,
    trigger_condition TEXT NOT NULL,
    calculation TEXT NOT NULL,
    dependencies TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES employees(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    link_to TEXT
  );
`);

console.log("Tables created.");

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------
const employeeData: Array<{
  name: string;
  employeeType: string;
  scheduleType: string;
  location: string;
  department: string;
  jobClassification: string;
  hireDate: string;
  isSupervisor: boolean;
  supervisorId?: number;
}> = [
  // 14 Lodi shift workers (IBEW 1245, 12-hour rotating)
  { name: "Kyle M", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2015-03-15", isSupervisor: false },
  { name: "Aaron S", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2016-06-01", isSupervisor: false },
  { name: "Dennis S", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2012-09-10", isSupervisor: false },
  { name: "Jerry P", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2010-01-20", isSupervisor: false },
  { name: "Jeff H", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2014-07-14", isSupervisor: false },
  { name: "Ryan Y", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2018-11-05", isSupervisor: false },
  { name: "Jeff P", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Relief Operator", hireDate: "2013-04-22", isSupervisor: false },
  { name: "Daniel C", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2019-02-18", isSupervisor: false },
  { name: "Steve A", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2017-08-30", isSupervisor: false },
  { name: "Mark D", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Shift Supervisor", hireDate: "2008-05-12", isSupervisor: true },
  { name: "Candace S", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2020-01-06", isSupervisor: false },
  { name: "Trevor M", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Control Operator", hireDate: "2021-03-15", isSupervisor: false },
  { name: "Ryan D", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Relief Operator", hireDate: "2022-06-20", isSupervisor: false },
  { name: "Jim M", employeeType: "ibew_1245", scheduleType: "12_hour_rotating", location: "lodi", department: "Operations", jobClassification: "Relief Operator", hireDate: "2011-10-01", isSupervisor: false },
  // 6 non-union employees
  { name: "Sarah Chen", employeeType: "non_union_exempt", scheduleType: "9_80", location: "roseville_hq", department: "Finance", jobClassification: "Payroll Manager", hireDate: "2016-02-01", isSupervisor: true },
  { name: "Michael Torres", employeeType: "non_union_exempt", scheduleType: "9_80", location: "roseville_hq", department: "Administration", jobClassification: "HR Analyst", hireDate: "2019-08-15", isSupervisor: false },
  { name: "Lisa Park", employeeType: "non_union_non_exempt", scheduleType: "8_80", location: "roseville_hq", department: "Finance", jobClassification: "Accounting Clerk", hireDate: "2023-01-09", isSupervisor: false },
  { name: "David Kim", employeeType: "non_union_non_exempt", scheduleType: "8_80", location: "roseville_hq", department: "Administration", jobClassification: "Administrative Assistant", hireDate: "2021-11-15", isSupervisor: false },
  { name: "Robert Garcia", employeeType: "non_union_exempt", scheduleType: "4_10", location: "lake_county", department: "Operations", jobClassification: "Geothermal Plant Manager", hireDate: "2014-04-01", isSupervisor: true },
  { name: "Amy Wilson", employeeType: "non_union_non_exempt", scheduleType: "8_80", location: "murphys", department: "Operations", jobClassification: "Hydro Technician", hireDate: "2020-07-20", isSupervisor: false },
];

const insertEmployee = sqlite.prepare(`
  INSERT INTO employees (name, employee_type, schedule_type, location, department, job_classification, hire_date, supervisor_id, is_supervisor)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const employeeIds: number[] = [];
for (const emp of employeeData) {
  const result = insertEmployee.run(
    emp.name,
    emp.employeeType,
    emp.scheduleType,
    emp.location,
    emp.department,
    emp.jobClassification,
    emp.hireDate,
    null, // set supervisor_id after all inserted
    emp.isSupervisor ? 1 : 0
  );
  employeeIds.push(Number(result.lastInsertRowid));
}

// Set supervisor_id: Mark D (id=10) supervises all Lodi shift workers
// Sarah Chen (id=15) supervises Roseville HQ non-supervisors
// Robert Garcia (id=19) supervises Lake County & Murphys
const updateSupervisor = sqlite.prepare(`UPDATE employees SET supervisor_id = ? WHERE id = ?`);
for (let i = 0; i < 14; i++) {
  if (employeeIds[i] !== employeeIds[9]) { // Not Mark D himself
    updateSupervisor.run(employeeIds[9], employeeIds[i]);
  }
}
// Roseville non-supervisors report to Sarah Chen
updateSupervisor.run(employeeIds[14], employeeIds[15]); // Michael Torres -> Sarah Chen
updateSupervisor.run(employeeIds[14], employeeIds[16]); // Lisa Park -> Sarah Chen
updateSupervisor.run(employeeIds[14], employeeIds[17]); // David Kim -> Sarah Chen
// Lake County/Murphys report to Robert Garcia
updateSupervisor.run(employeeIds[18], employeeIds[19]); // Amy Wilson -> Robert Garcia

console.log(`Seeded ${employeeIds.length} employees.`);

// ---------------------------------------------------------------------------
// Schedules — Full July 2024 for 14 Lodi operators
// ---------------------------------------------------------------------------
// Shift pattern from the Lodi Energy Center schedule spreadsheet
// Key: D=Day(06-18), N=Night(18-06), R=Relief/Off, X=Coverage needed, C=Coverage, H=Holiday, O=Off

// July 2024 has 31 days. Each operator gets a row of 31 codes.
// Groups rotate: A-crew (days 1-3 on days, then nights, etc.), B-crew, relief covers gaps
const scheduleData: Record<string, string[]> = {
  // Employee name -> array of 31 shift codes for July 1-31
  "Kyle M":    ["D","D","D","H","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R"],
  "Aaron S":   ["D","D","D","H","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R"],
  "Dennis S":  ["N","N","N","H","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R"],
  "Jerry P":   ["N","N","N","H","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R"],
  "Jeff H":    ["R","R","D","H","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R"],
  "Ryan Y":    ["R","R","D","H","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R"],
  "Jeff P":    ["R","R","R","H","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D"],
  "Daniel C":  ["R","R","R","H","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N"],
  "Steve A":   ["R","R","R","H","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N"],
  "Mark D":    ["D","D","D","H","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R"],
  "Candace S": ["R","R","R","H","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N"],
  "Trevor M":  ["N","N","N","H","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R","R","D","D","D","R","R","R","N","N","N","R","R"],
  "Ryan D":    ["R","R","C","H","R","R","R","R","R","R","C","C","R","R","C","C","C","C","R","R","R","R","R","C","C","C","R","R","R","R","R"],
  "Jim M":     ["R","C","R","H","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R","R"],
};

function shiftTimes(code: string): { start: string | null; end: string | null } {
  switch (code) {
    case "D": return { start: "06:00", end: "18:00" };
    case "N": return { start: "18:00", end: "06:00" };
    case "C": return { start: "06:00", end: "18:00" }; // default coverage to day, notes will clarify
    case "H": return { start: "06:00", end: "18:00" }; // holiday — treated as day shift for those working
    default: return { start: null, end: null };
  }
}

const insertSchedule = sqlite.prepare(`
  INSERT INTO schedules (employee_id, date, shift_code, start_time, end_time, is_modified, modified_by, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let scheduleCount = 0;
const employeeNameToId: Record<string, number> = {};
employeeData.forEach((emp, i) => {
  employeeNameToId[emp.name] = employeeIds[i];
});

// Coverage notes
const coverageNotes: Record<string, Record<number, string>> = {
  "Jim M": {
    2: "Covering for Jeff H on 7/2",
  },
  "Ryan D": {
    3: "Coverage day - July 4th",
    10: "Covering for Jeff H on 7/10 (night)",
    11: "Covering for Jeff H on 7/11 (night)",
    15: "Covering for Steve A on 7/15",
    16: "Covering for Steve A on 7/16",
    17: "Covering for Steve A on 7/17",
    18: "Covering for Steve A on 7/18",
    23: "Covering for Aaron S (training) on 7/23",
    24: "Covering for Aaron S (training) on 7/24",
    25: "Covering for Aaron S (training) on 7/25",
  },
};

// Insert Lodi schedules
for (const [name, codes] of Object.entries(scheduleData)) {
  const empId = employeeNameToId[name];
  for (let day = 0; day < codes.length; day++) {
    const code = codes[day];
    const dateStr = `2024-07-${String(day + 1).padStart(2, "0")}`;
    const times = shiftTimes(code);

    // Check for coverage modifications
    const isModified = (coverageNotes[name] && coverageNotes[name][day + 1]) ? true : false;
    const notes = coverageNotes[name]?.[day + 1] || null;

    // For Ryan D night coverage
    let startTime = times.start;
    let endTime = times.end;
    if (name === "Ryan D" && notes?.includes("(night)")) {
      startTime = "18:00";
      endTime = "06:00";
    }

    insertSchedule.run(empId, dateStr, code, startTime, endTime, isModified ? 1 : 0, isModified ? employeeNameToId["Mark D"] : null, notes);
    scheduleCount++;
  }
}

// Non-union employee schedules (simplified for July 2024)
// 9/80: 9-hour days Mon-Thu, alternating 8hr/off Fridays
// 4/10: 10-hour days Mon-Thu, off Fri-Sun
// 8/80: 8-hour days Mon-Fri

const nonUnionSchedules: Array<{ name: string; pattern: (day: number) => { code: string; start: string | null; end: string | null } }> = [
  {
    name: "Sarah Chen",
    pattern: (dayOfWeek: number) => {
      if (dayOfWeek === 0 || dayOfWeek === 6) return { code: "OFF", start: null, end: null };
      if (dayOfWeek === 5) return { code: "D", start: "07:00", end: "15:00" }; // alternating Friday (simplified: all 8hr Fridays)
      return { code: "D", start: "07:00", end: "16:00" }; // 9hr Mon-Thu
    },
  },
  {
    name: "Michael Torres",
    pattern: (dayOfWeek: number) => {
      if (dayOfWeek === 0 || dayOfWeek === 6) return { code: "OFF", start: null, end: null };
      if (dayOfWeek === 5) return { code: "D", start: "07:00", end: "15:00" };
      return { code: "D", start: "07:00", end: "16:00" };
    },
  },
  {
    name: "Lisa Park",
    pattern: (dayOfWeek: number) => {
      if (dayOfWeek === 0 || dayOfWeek === 6) return { code: "OFF", start: null, end: null };
      return { code: "D", start: "08:00", end: "16:30" }; // 8hr + 30min lunch
    },
  },
  {
    name: "David Kim",
    pattern: (dayOfWeek: number) => {
      if (dayOfWeek === 0 || dayOfWeek === 6) return { code: "OFF", start: null, end: null };
      return { code: "D", start: "08:00", end: "16:30" };
    },
  },
  {
    name: "Robert Garcia",
    pattern: (dayOfWeek: number) => {
      if (dayOfWeek >= 1 && dayOfWeek <= 4) return { code: "D", start: "06:00", end: "16:30" }; // 4/10
      return { code: "OFF", start: null, end: null };
    },
  },
  {
    name: "Amy Wilson",
    pattern: (dayOfWeek: number) => {
      if (dayOfWeek === 0 || dayOfWeek === 6) return { code: "OFF", start: null, end: null };
      return { code: "D", start: "07:00", end: "15:30" };
    },
  },
];

for (const sched of nonUnionSchedules) {
  const empId = employeeNameToId[sched.name];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2024, 6, day); // July 2024
    const dayOfWeek = date.getDay();
    const dateStr = `2024-07-${String(day).padStart(2, "0")}`;
    let { code, start, end } = sched.pattern(dayOfWeek);

    // July 4th is a holiday for everyone
    if (day === 4) {
      code = "H";
      start = null;
      end = null;
    }

    insertSchedule.run(empId, dateStr, code, start, end, 0, null, day === 4 ? "Independence Day" : null);
    scheduleCount++;
  }
}

console.log(`Seeded ${scheduleCount} schedule entries.`);

// ---------------------------------------------------------------------------
// Leave Balances
// ---------------------------------------------------------------------------
const insertLeaveBalance = sqlite.prepare(`
  INSERT INTO leave_balances (employee_id, leave_type, balance_hours, accrual_rate_per_period, cap_hours, last_accrual_date)
  VALUES (?, ?, ?, ?, ?, ?)
`);

let leaveBalanceCount = 0;

for (let i = 0; i < employeeIds.length; i++) {
  const empId = employeeIds[i];
  const emp = employeeData[i];
  const isShiftWorker = emp.scheduleType === "12_hour_rotating";
  const isNewHire = emp.hireDate >= "2022-01-01";

  // Vacation — all employees
  const vacBalance = isNewHire ? 24 : (isShiftWorker ? 120 : 80);
  const vacAccrual = isShiftWorker ? 6.0 : 3.08;
  const vacCap = isShiftWorker ? 360 : 240;
  insertLeaveBalance.run(empId, "vacation", vacBalance, vacAccrual, vacCap, "2024-06-30");
  leaveBalanceCount++;

  // Sick — all employees
  const sickBalance = isNewHire ? 36 : (isShiftWorker ? 180 : 96);
  const sickAccrual = isShiftWorker ? 6.0 : 3.69;
  insertLeaveBalance.run(empId, "sick", sickBalance, sickAccrual, null, "2024-06-30");
  leaveBalanceCount++;

  // Float — all employees
  const floatBalance = isShiftWorker ? 24 : 16;
  insertLeaveBalance.run(empId, "float", floatBalance, 0, null, "2024-01-01");
  leaveBalanceCount++;

  // LBA (Leave Bank Accrual) — shift workers only
  if (isShiftWorker) {
    const lbaBalance = isNewHire ? 12 : 48;
    insertLeaveBalance.run(empId, "lba", lbaBalance, 2.77, 120, "2024-06-30");
    leaveBalanceCount++;
  }

  // Holiday bank — shift workers only
  if (isShiftWorker) {
    const holBalance = isNewHire ? 24 : 96;
    insertLeaveBalance.run(empId, "holiday_bank", holBalance, 0, null, "2024-06-30");
    leaveBalanceCount++;
  }

  // Comp time — some employees
  if (i % 3 === 0) {
    insertLeaveBalance.run(empId, "comp", isShiftWorker ? 12 : 8, 0, 40, "2024-06-30");
    leaveBalanceCount++;
  }
}

console.log(`Seeded ${leaveBalanceCount} leave balance records.`);

// ---------------------------------------------------------------------------
// Timesheets & Time Entries
// ---------------------------------------------------------------------------
const insertTimesheet = sqlite.prepare(`
  INSERT INTO timesheets (employee_id, pay_period_start, pay_period_end, status, submitted_at, approved_at, approved_by, rejection_reason)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertTimeEntry = sqlite.prepare(`
  INSERT INTO time_entries (timesheet_id, date, pay_code, hours, project_code, cost_code, notes, is_auto_calculated)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let timesheetCount = 0;
let timeEntryCount = 0;

// Approved timesheets from prior pay periods
const approvedTimesheets = [
  { empIndex: 0, ppStart: "2024-06-01", ppEnd: "2024-06-15", submittedAt: "2024-06-16T08:00:00", approvedAt: "2024-06-17T10:30:00" },
  { empIndex: 2, ppStart: "2024-06-01", ppEnd: "2024-06-15", submittedAt: "2024-06-15T18:00:00", approvedAt: "2024-06-17T09:00:00" },
  { empIndex: 4, ppStart: "2024-06-16", ppEnd: "2024-06-30", submittedAt: "2024-07-01T07:00:00", approvedAt: "2024-07-01T14:00:00" },
  { empIndex: 14, ppStart: "2024-06-16", ppEnd: "2024-06-30", submittedAt: "2024-07-01T08:30:00", approvedAt: "2024-07-02T09:00:00" },
];

for (const ts of approvedTimesheets) {
  const empId = employeeIds[ts.empIndex];
  const isShiftWorker = employeeData[ts.empIndex].scheduleType === "12_hour_rotating";
  const supervisorId = isShiftWorker ? employeeNameToId["Mark D"] : employeeNameToId["Sarah Chen"];

  const result = insertTimesheet.run(empId, ts.ppStart, ts.ppEnd, "approved", ts.submittedAt, ts.approvedAt, supervisorId, null);
  const tsId = Number(result.lastInsertRowid);
  timesheetCount++;

  // Generate time entries for the pay period
  const startDate = new Date(ts.ppStart);
  const endDate = new Date(ts.ppEnd);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    if (isShiftWorker) {
      // Roughly: 12hr regular shifts with some OT
      if (d.getDay() !== 0 && Math.random() > 0.3) {
        insertTimeEntry.run(tsId, dateStr, "REG", 12, "LEC-OPS", "5100", null, 1);
        timeEntryCount++;
        // Occasional OT
        if (Math.random() > 0.85) {
          insertTimeEntry.run(tsId, dateStr, "OT_1_5", 2, "LEC-OPS", "5100", "Extended shift coverage", 0);
          timeEntryCount++;
        }
      }
    } else {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const hours = employeeData[ts.empIndex].scheduleType === "9_80" ? 9 : 8;
        insertTimeEntry.run(tsId, dateStr, "REG", hours, "ADMIN", "1000", null, 1);
        timeEntryCount++;
      }
    }
  }
}

// Submitted (pending approval) timesheets
const submittedTimesheets = [
  { empIndex: 1, ppStart: "2024-07-01", ppEnd: "2024-07-15", submittedAt: "2024-07-15T17:00:00" },
  { empIndex: 3, ppStart: "2024-07-01", ppEnd: "2024-07-15", submittedAt: "2024-07-16T06:30:00" },
  { empIndex: 15, ppStart: "2024-07-01", ppEnd: "2024-07-15", submittedAt: "2024-07-15T16:00:00" },
];

for (const ts of submittedTimesheets) {
  const empId = employeeIds[ts.empIndex];
  const isShiftWorker = employeeData[ts.empIndex].scheduleType === "12_hour_rotating";

  const result = insertTimesheet.run(empId, ts.ppStart, ts.ppEnd, "submitted", ts.submittedAt, null, null, null);
  const tsId = Number(result.lastInsertRowid);
  timesheetCount++;

  const startDate = new Date(ts.ppStart);
  const endDate = new Date(ts.ppEnd);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    if (isShiftWorker) {
      if (d.getDay() !== 0 && Math.random() > 0.3) {
        insertTimeEntry.run(tsId, dateStr, "REG", 12, "LEC-OPS", "5100", null, 1);
        timeEntryCount++;
      }
      // July 4th holiday
      if (dateStr === "2024-07-04") {
        insertTimeEntry.run(tsId, dateStr, "HOL", 12, "LEC-OPS", "5100", "Independence Day - worked", 0);
        timeEntryCount++;
      }
    } else {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (dateStr === "2024-07-04") {
          insertTimeEntry.run(tsId, dateStr, "HOL", 8, "ADMIN", "1000", "Independence Day", 0);
        } else {
          insertTimeEntry.run(tsId, dateStr, "REG", 8, "ADMIN", "1000", null, 1);
        }
        timeEntryCount++;
      }
    }
  }
}

console.log(`Seeded ${timesheetCount} timesheets with ${timeEntryCount} time entries.`);

// ---------------------------------------------------------------------------
// Leave Requests
// ---------------------------------------------------------------------------
const insertLeaveRequest = sqlite.prepare(`
  INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_hours, status, approver_id, submitted_at, decided_at, decision_notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const leaveRequestData: Array<{
  empIndex: number; leaveType: string; startDate: string; endDate: string;
  totalHours: number; status: string; submittedAt: string;
  decidedAt?: string | null; notes?: string | null;
}> = [
  // Pending requests
  { empIndex: 0, leaveType: "vacation", startDate: "2024-07-22", endDate: "2024-07-25", totalHours: 48, status: "pending", submittedAt: "2024-07-10T09:00:00" },
  { empIndex: 5, leaveType: "float", startDate: "2024-08-02", endDate: "2024-08-02", totalHours: 12, status: "pending", submittedAt: "2024-07-12T14:00:00" },
  { empIndex: 16, leaveType: "sick", startDate: "2024-07-18", endDate: "2024-07-19", totalHours: 16, status: "pending", submittedAt: "2024-07-17T07:30:00" },
  { empIndex: 8, leaveType: "vacation", startDate: "2024-08-05", endDate: "2024-08-09", totalHours: 60, status: "pending", submittedAt: "2024-07-08T11:00:00" },
  // Approved
  { empIndex: 1, leaveType: "vacation", startDate: "2024-06-10", endDate: "2024-06-14", totalHours: 60, status: "approved", submittedAt: "2024-05-20T10:00:00", decidedAt: "2024-05-21T09:00:00", notes: "Approved. Coverage arranged." },
  { empIndex: 3, leaveType: "float", startDate: "2024-06-20", endDate: "2024-06-20", totalHours: 12, status: "approved", submittedAt: "2024-06-15T08:00:00", decidedAt: "2024-06-16T10:00:00", notes: null },
  { empIndex: 17, leaveType: "vacation", startDate: "2024-06-24", endDate: "2024-06-28", totalHours: 40, status: "approved", submittedAt: "2024-06-01T09:00:00", decidedAt: "2024-06-03T11:00:00", notes: "Approved" },
  // Rejected
  { empIndex: 6, leaveType: "vacation", startDate: "2024-07-01", endDate: "2024-07-05", totalHours: 60, status: "rejected", submittedAt: "2024-06-10T12:00:00", decidedAt: "2024-06-11T08:00:00", notes: "Insufficient coverage during holiday period. Please resubmit for alternate dates." },
];

for (const lr of leaveRequestData) {
  const empId = employeeIds[lr.empIndex];
  const isShiftWorker = employeeData[lr.empIndex].scheduleType === "12_hour_rotating";
  const approverId = isShiftWorker ? employeeNameToId["Mark D"] : employeeNameToId["Sarah Chen"];

  insertLeaveRequest.run(
    empId,
    lr.leaveType,
    lr.startDate,
    lr.endDate,
    lr.totalHours,
    lr.status,
    approverId,
    lr.submittedAt,
    lr.decidedAt || null,
    lr.notes || null
  );
}

console.log(`Seeded ${leaveRequestData.length} leave requests.`);

// ---------------------------------------------------------------------------
// Pay Rules — All ~130 rules from Appendix D
// ---------------------------------------------------------------------------
const insertPayRule = sqlite.prepare(`
  INSERT INTO pay_rules (rule_id, category, description, employee_group, schedule_type, trigger_condition, calculation, dependencies, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const payRulesData: Array<{
  ruleId: string;
  category: string;
  description: string;
  employeeGroup: string;
  scheduleType: string | null;
  triggerCondition: string;
  calculation: string;
  dependencies: string | null;
}> = [
  // HEA-TU: Time Unit Rules
  { ruleId: "HEA-TU-001", category: "Time Units", description: "Minimum time unit for recording is 0.25 hours (15 minutes)", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Any time entry", calculation: "Round to nearest 0.25 hours", dependencies: null },
  { ruleId: "HEA-TU-002", category: "Time Units", description: "Standard work day for exempt employees is 8 hours", employeeGroup: "HEA", scheduleType: "8_80", triggerCondition: "Regular work day", calculation: "8 hours = 1 standard day", dependencies: null },
  { ruleId: "HEA-TU-003", category: "Time Units", description: "Standard work day for 9/80 schedule is 9 hours (8 on alternate Friday)", employeeGroup: "HEA", scheduleType: "9_80", triggerCondition: "Regular work day", calculation: "9 hours Mon-Thu, 8 hours alternate Friday", dependencies: null },
  { ruleId: "HEA-TU-004", category: "Time Units", description: "Standard work day for 4/10 schedule is 10 hours", employeeGroup: "HEA", scheduleType: "4_10", triggerCondition: "Regular work day", calculation: "10 hours = 1 standard day", dependencies: null },
  { ruleId: "HEA-TU-005", category: "Time Units", description: "Pay period is biweekly (14 calendar days)", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Pay period boundary", calculation: "14 calendar days per pay period", dependencies: null },

  // HEA-TA: Time Approval Rules
  { ruleId: "HEA-TA-001", category: "Time Approval", description: "Timesheets must be submitted by employee before supervisor review", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Timesheet submission", calculation: "Status: draft -> submitted", dependencies: null },
  { ruleId: "HEA-TA-002", category: "Time Approval", description: "Supervisor must approve timesheet before payroll processing", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Timesheet in submitted status", calculation: "Status: submitted -> approved/rejected", dependencies: "HEA-TA-001" },
  { ruleId: "HEA-TA-003", category: "Time Approval", description: "Rejected timesheets return to employee for correction", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Supervisor rejects timesheet", calculation: "Status: submitted -> rejected, rejection_reason required", dependencies: "HEA-TA-002" },
  { ruleId: "HEA-TA-004", category: "Time Approval", description: "Payroll admin final review before ADP export", employeeGroup: "HEA", scheduleType: null, triggerCondition: "All timesheets approved for pay period", calculation: "Status: approved -> processed", dependencies: "HEA-TA-002" },
  { ruleId: "HEA-TA-005", category: "Time Approval", description: "Timesheet corrections after approval require audit trail", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Modification to approved timesheet", calculation: "Create audit_log entry with old/new values", dependencies: "HEA-TA-002" },

  // HEA-CW: Compressed Workweek Rules
  { ruleId: "HEA-CW-001", category: "Compressed Workweek", description: "9/80 schedule: 80 hours over 9 working days in 2-week period", employeeGroup: "HEA", scheduleType: "9_80", triggerCondition: "Employee on 9/80 schedule", calculation: "9hrs x 8days + 8hrs x 1day = 80hrs per pay period", dependencies: null },
  { ruleId: "HEA-CW-002", category: "Compressed Workweek", description: "4/10 schedule: 40 hours over 4 working days per week", employeeGroup: "HEA", scheduleType: "4_10", triggerCondition: "Employee on 4/10 schedule", calculation: "10hrs x 4days = 40hrs per week", dependencies: null },
  { ruleId: "HEA-CW-003", category: "Compressed Workweek", description: "9/80 alternate Friday off is scheduled, not overtime-eligible", employeeGroup: "HEA", scheduleType: "9_80", triggerCondition: "Alternate Friday", calculation: "No regular hours, not counted toward OT threshold", dependencies: "HEA-CW-001" },
  { ruleId: "HEA-CW-004", category: "Compressed Workweek", description: "4/10 Friday-Sunday off is scheduled, not overtime-eligible", employeeGroup: "HEA", scheduleType: "4_10", triggerCondition: "Friday through Sunday", calculation: "No regular hours, not counted toward OT threshold", dependencies: "HEA-CW-002" },
  { ruleId: "HEA-CW-005", category: "Compressed Workweek", description: "Compressed schedule change requires 14-day advance notice", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Schedule type change request", calculation: "Validate notice period >= 14 calendar days", dependencies: null },

  // HEA-WP: Work Period Rules
  { ruleId: "HEA-WP-001", category: "Work Period", description: "FLSA work period for non-exempt HEA is 7-day workweek", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Non-exempt employee weekly hours", calculation: "Track hours per 7-day workweek for FLSA compliance", dependencies: null },
  { ruleId: "HEA-WP-002", category: "Work Period", description: "Workweek begins Sunday 00:00 and ends Saturday 23:59", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Workweek boundary calculation", calculation: "Sunday 00:00 to Saturday 23:59", dependencies: null },
  { ruleId: "HEA-WP-003", category: "Work Period", description: "Exempt employees are not subject to daily/weekly OT thresholds", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Exempt employee classification", calculation: "No OT calculation required", dependencies: null },

  // HEA-PC: Pay Code Rules
  { ruleId: "HEA-PC-001", category: "Pay Codes", description: "REG: Regular hours at straight-time rate", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Hours within scheduled shift", calculation: "Hours x base rate", dependencies: null },
  { ruleId: "HEA-PC-002", category: "Pay Codes", description: "OT_1_5: Overtime at 1.5x base rate", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Non-exempt: >8hrs/day or >40hrs/week", calculation: "Hours x (base rate x 1.5)", dependencies: "HEA-WP-001" },
  { ruleId: "HEA-PC-003", category: "Pay Codes", description: "OT_2_0: Double-time at 2.0x base rate", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Non-exempt: >12hrs/day or 7th consecutive day", calculation: "Hours x (base rate x 2.0)", dependencies: "HEA-PC-002" },
  { ruleId: "HEA-PC-004", category: "Pay Codes", description: "HOL: Holiday pay at straight-time (bank or paid)", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Designated NCPA holiday", calculation: "Scheduled hours x base rate", dependencies: null },
  { ruleId: "HEA-PC-005", category: "Pay Codes", description: "VAC: Vacation leave drawn from balance", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Approved vacation leave request", calculation: "Deduct hours from vacation balance", dependencies: null },
  { ruleId: "HEA-PC-006", category: "Pay Codes", description: "SICK: Sick leave drawn from balance", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Sick leave usage", calculation: "Deduct hours from sick balance", dependencies: null },
  { ruleId: "HEA-PC-007", category: "Pay Codes", description: "FLOAT: Floating holiday drawn from annual allocation", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Approved floating holiday request", calculation: "Deduct hours from float balance", dependencies: null },
  { ruleId: "HEA-PC-008", category: "Pay Codes", description: "COMP: Compensatory time off drawn from comp balance", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Comp time usage", calculation: "Deduct hours from comp balance", dependencies: null },
  { ruleId: "HEA-PC-009", category: "Pay Codes", description: "ADMIN: Administrative leave (jury duty, bereavement, etc.)", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Approved administrative leave", calculation: "Paid at base rate, no balance deduction", dependencies: null },

  // IBEW-WS: Work Schedule Rules
  { ruleId: "IBEW-WS-001", category: "Work Schedule", description: "Standard shift is 12 hours for Lodi Energy Center operators", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Shift worker regular schedule", calculation: "12 hours per shift", dependencies: null },
  { ruleId: "IBEW-WS-002", category: "Work Schedule", description: "Day shift: 06:00 to 18:00", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Day shift assignment", calculation: "Start: 06:00, End: 18:00, Duration: 12hrs", dependencies: "IBEW-WS-001" },
  { ruleId: "IBEW-WS-003", category: "Work Schedule", description: "Night shift: 18:00 to 06:00", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Night shift assignment", calculation: "Start: 18:00, End: 06:00, Duration: 12hrs", dependencies: "IBEW-WS-001" },
  { ruleId: "IBEW-WS-004", category: "Work Schedule", description: "Rotating pattern: 3 on, 3 off, 3 on, 3 off (alternating D/N)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Schedule generation", calculation: "DDD-RRR-NNN-RRR pattern repeating", dependencies: "IBEW-WS-001" },
  { ruleId: "IBEW-WS-005", category: "Work Schedule", description: "Work period for IBEW shift workers is 28 days (FLSA 7(k) exemption)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "FLSA work period calculation", calculation: "28-day work period for OT threshold", dependencies: null },
  { ruleId: "IBEW-WS-006", category: "Work Schedule", description: "Shift workers average 182 hours per 28-day period", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Target hours calculation", calculation: "Average 14 shifts x 12hrs + 2hrs = 182hrs per 28 days", dependencies: "IBEW-WS-004" },
  { ruleId: "IBEW-WS-007", category: "Work Schedule", description: "Night shift differential applies to all hours between 18:00-06:00", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Hours worked 18:00-06:00", calculation: "Base rate + shift differential per CBA", dependencies: "IBEW-WS-003" },

  // IBEW-LBA: Leave Bank Accrual Rules
  { ruleId: "IBEW-LBA-001", category: "Leave Bank Accrual", description: "LBA accrues each pay period for shift workers", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "End of pay period", calculation: "Accrual rate per period added to LBA balance", dependencies: null },
  { ruleId: "IBEW-LBA-002", category: "Leave Bank Accrual", description: "LBA compensates for hours over 80 in a pay period due to schedule", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Scheduled hours > 80 in pay period", calculation: "Excess hours credited to LBA balance", dependencies: "IBEW-LBA-001" },
  { ruleId: "IBEW-LBA-003", category: "Leave Bank Accrual", description: "LBA can be used as paid time off when scheduled hours < 80", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Scheduled hours < 80 in pay period", calculation: "Deficit hours drawn from LBA balance", dependencies: "IBEW-LBA-001" },
  { ruleId: "IBEW-LBA-004", category: "Leave Bank Accrual", description: "LBA balance cap of 120 hours", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "LBA balance exceeds cap", calculation: "Stop accrual at 120 hours; excess paid out or forfeited per CBA", dependencies: "IBEW-LBA-001" },
  { ruleId: "IBEW-LBA-005", category: "Leave Bank Accrual", description: "LBA usage requires no approval (auto-applied to balance short periods)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Pay period with < 80 scheduled hours", calculation: "Automatic LBA deduction to reach 80 hours", dependencies: "IBEW-LBA-003" },

  // IBEW-OT: Overtime Rules
  { ruleId: "IBEW-OT-001", category: "Overtime", description: "Overtime for shift workers: hours beyond scheduled shift (>12hrs/day)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Daily hours > 12", calculation: "(Hours - 12) x 1.5 rate", dependencies: "IBEW-WS-001" },
  { ruleId: "IBEW-OT-002", category: "Overtime", description: "Double-time for shift workers after 16 hours in a day", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Daily hours > 16", calculation: "(Hours - 16) x 2.0 rate; hours 12-16 at 1.5x", dependencies: "IBEW-OT-001" },
  { ruleId: "IBEW-OT-003", category: "Overtime", description: "Callback OT: minimum 4 hours at 1.5x when called back to work", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Called back to work on off day/after shift", calculation: "Minimum 4 hours x 1.5 rate", dependencies: null },
  { ruleId: "IBEW-OT-004", category: "Overtime", description: "Holdover OT: continuation of shift at 1.5x", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Required to stay past scheduled end of shift", calculation: "Extra hours x 1.5 rate (continuous from shift)", dependencies: "IBEW-OT-001" },
  { ruleId: "IBEW-OT-005", category: "Overtime", description: "Mandatory OT: must accept if insufficient coverage", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Coverage gap with no volunteers", calculation: "OT assigned per inverse seniority rotation", dependencies: null },
  { ruleId: "IBEW-OT-006", category: "Overtime", description: "Voluntary OT: distributed by seniority rotation", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Coverage gap with volunteers", calculation: "OT offered by seniority; rotate list after acceptance", dependencies: null },
  { ruleId: "IBEW-OT-007", category: "Overtime", description: "Rest period: minimum 8 hours between shifts", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Consecutive shift scheduling", calculation: "Must have >= 8 hours between shift end and next start", dependencies: null },

  // IBEW-CO: Coverage Rules
  { ruleId: "IBEW-CO-001", category: "Coverage", description: "Minimum staffing: 2 operators per shift at all times", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Shift staffing check", calculation: "Count operators per shift >= 2", dependencies: null },
  { ruleId: "IBEW-CO-002", category: "Coverage", description: "Relief operators fill scheduled vacancies", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Vacancy on shift (leave, training, etc.)", calculation: "Assign relief operator to fill gap", dependencies: "IBEW-CO-001" },
  { ruleId: "IBEW-CO-003", category: "Coverage", description: "Coverage assignment creates modified schedule entry", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Relief/coverage assignment made", calculation: "Mark schedule as modified with coverage notes", dependencies: "IBEW-CO-002" },
  { ruleId: "IBEW-CO-004", category: "Coverage", description: "X code marks open coverage need on schedule", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Unfilled shift vacancy", calculation: "Flag shift with X code; trigger notification", dependencies: "IBEW-CO-001" },
  { ruleId: "IBEW-CO-005", category: "Coverage", description: "Coverage on off day paid as OT (callback rules apply)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Relief works on scheduled off day", calculation: "Apply callback OT minimum 4 hours at 1.5x", dependencies: "IBEW-OT-003" },

  // IBEW-SP: Special Pay Rules
  { ruleId: "IBEW-SP-001", category: "Special Pay", description: "Holiday worked: regular pay + holiday premium", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Work on designated NCPA holiday", calculation: "Regular rate + holiday premium per CBA", dependencies: null },
  { ruleId: "IBEW-SP-002", category: "Special Pay", description: "Holiday not worked: holiday bank credit", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Designated holiday falls on off day", calculation: "Credit scheduled hours to holiday bank", dependencies: null },
  { ruleId: "IBEW-SP-003", category: "Special Pay", description: "Holiday bank can be used as paid time off", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Employee requests holiday bank usage", calculation: "Deduct hours from holiday_bank balance", dependencies: "IBEW-SP-002" },
  { ruleId: "IBEW-SP-004", category: "Special Pay", description: "Training pay: regular rate for scheduled training", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Assigned to training", calculation: "Training hours at regular rate; coverage arranged", dependencies: null },
  { ruleId: "IBEW-SP-005", category: "Special Pay", description: "Shift trade: no OT generated if pre-approved and even exchange", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Mutual shift trade between operators", calculation: "Hours count toward trader's regular schedule; no OT", dependencies: null },

  // IBEW-TR: Time Recording Rules
  { ruleId: "IBEW-TR-001", category: "Time Recording", description: "Shift workers record actual start/end times", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Time entry for shift", calculation: "Record actual times; compare to scheduled for variance", dependencies: null },
  { ruleId: "IBEW-TR-002", category: "Time Recording", description: "Auto-populate timesheet from schedule for regular shifts", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "New pay period / timesheet creation", calculation: "Pre-fill time entries from schedule data", dependencies: "IBEW-WS-004" },
  { ruleId: "IBEW-TR-003", category: "Time Recording", description: "Exceptions only entry: employee edits deviations from schedule", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Employee opens auto-populated timesheet", calculation: "Only modify entries that differ from schedule", dependencies: "IBEW-TR-002" },

  // IBEW-ML: Meal & Rest Rules
  { ruleId: "IBEW-ML-001", category: "Meal & Rest", description: "12-hour shift includes paid meal period (on-duty)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "12-hour shift", calculation: "No deduction for meal; included in 12hrs", dependencies: "IBEW-WS-001" },
  { ruleId: "IBEW-ML-002", category: "Meal & Rest", description: "Meal penalty if no meal opportunity within 5 hours (CA Labor Code)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "No meal break taken within 5 hours of shift start", calculation: "1 hour additional pay at regular rate", dependencies: null },
  { ruleId: "IBEW-ML-003", category: "Meal & Rest", description: "Rest period: 10 minutes per 4 hours worked (CA requirement)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Shift of 4+ hours", calculation: "3 rest periods per 12-hour shift; paid", dependencies: null },

  // IBEW-RP: Reporting Pay Rules
  { ruleId: "IBEW-RP-001", category: "Reporting Pay", description: "Minimum reporting pay: 4 hours if sent home early", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Employee reports to work and is sent home", calculation: "Minimum 4 hours pay at regular rate", dependencies: null },
  { ruleId: "IBEW-RP-002", category: "Reporting Pay", description: "Split shift premium if break > 1 hour during shift", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Break > 1 hour within shift", calculation: "Split shift premium per CBA terms", dependencies: null },

  // AUD: Audit Rules
  { ruleId: "AUD-001", category: "Audit", description: "All timesheet modifications create audit trail entry", employeeGroup: "All", scheduleType: null, triggerCondition: "Any timesheet field change", calculation: "Log user_id, action, entity, old_value, new_value, timestamp", dependencies: null },
  { ruleId: "AUD-002", category: "Audit", description: "Schedule modifications logged with modifier identity", employeeGroup: "All", scheduleType: null, triggerCondition: "Schedule entry modified", calculation: "Set is_modified=true, modified_by=user_id, log change", dependencies: null },
  { ruleId: "AUD-003", category: "Audit", description: "Leave balance adjustments logged", employeeGroup: "All", scheduleType: null, triggerCondition: "Leave balance change outside normal accrual", calculation: "Audit log entry with before/after balance", dependencies: null },
  { ruleId: "AUD-004", category: "Audit", description: "Approval/rejection actions logged with decision maker", employeeGroup: "All", scheduleType: null, triggerCondition: "Timesheet or leave request status change", calculation: "Log approver_id, action, timestamp, notes", dependencies: null },
  { ruleId: "AUD-005", category: "Audit", description: "Retroactive changes require payroll admin approval", employeeGroup: "All", scheduleType: null, triggerCondition: "Change to processed pay period data", calculation: "Require payroll_admin role; create priority audit entry", dependencies: null },
  { ruleId: "AUD-006", category: "Audit", description: "Audit log is immutable — no edits or deletes", employeeGroup: "All", scheduleType: null, triggerCondition: "Any attempt to modify audit_log", calculation: "Deny modification; append-only table", dependencies: null },

  // EXC: Exception/Alert Rules
  { ruleId: "EXC-001", category: "Exceptions", description: "Missing timesheet alert: 2 days after pay period end", employeeGroup: "All", scheduleType: null, triggerCondition: "No timesheet submitted 2 days after period end", calculation: "Notify employee and supervisor", dependencies: null },
  { ruleId: "EXC-002", category: "Exceptions", description: "Overtime threshold warning at 80% of limit", employeeGroup: "All", scheduleType: null, triggerCondition: "Employee OT hours >= 80% of max threshold", calculation: "Notify supervisor of approaching OT limit", dependencies: null },
  { ruleId: "EXC-003", category: "Exceptions", description: "Leave balance low warning at 20% of cap", employeeGroup: "All", scheduleType: null, triggerCondition: "Leave balance <= 20% of cap_hours", calculation: "Notify employee of low balance", dependencies: null },
  { ruleId: "EXC-004", category: "Exceptions", description: "Schedule conflict detection: double-booking", employeeGroup: "All", scheduleType: null, triggerCondition: "Two overlapping shift assignments for same employee", calculation: "Flag conflict; notify scheduler", dependencies: null },
  { ruleId: "EXC-005", category: "Exceptions", description: "Negative leave balance prevention", employeeGroup: "All", scheduleType: null, triggerCondition: "Leave request would cause negative balance", calculation: "Deny request; show available balance", dependencies: null },
  { ruleId: "EXC-006", category: "Exceptions", description: "Minimum staffing violation alert", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Shift drops below minimum staffing", calculation: "Priority alert to supervisor and relief pool", dependencies: "IBEW-CO-001" },
  { ruleId: "EXC-007", category: "Exceptions", description: "Rest period violation alert (< 8 hours between shifts)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Scheduled rest < 8 hours", calculation: "Flag violation; notify supervisor", dependencies: "IBEW-OT-007" },
  { ruleId: "EXC-008", category: "Exceptions", description: "Unapproved timesheet past deadline escalation", employeeGroup: "All", scheduleType: null, triggerCondition: "Submitted timesheet not reviewed within 3 days", calculation: "Escalate to payroll admin; notify supervisor", dependencies: null },

  // PAY: Payroll Processing Rules
  { ruleId: "PAY-001", category: "Payroll", description: "Biweekly payroll cycle aligned to NCPA pay periods", employeeGroup: "All", scheduleType: null, triggerCondition: "Pay period end", calculation: "Process all approved timesheets for period", dependencies: null },
  { ruleId: "PAY-002", category: "Payroll", description: "ADP export file generation with mapped pay codes", employeeGroup: "All", scheduleType: null, triggerCondition: "Payroll admin initiates export", calculation: "Map internal pay codes to ADP format; generate file", dependencies: "PAY-001" },
  { ruleId: "PAY-003", category: "Payroll", description: "Leave accruals processed at end of pay period", employeeGroup: "All", scheduleType: null, triggerCondition: "Pay period processing", calculation: "Add accrual_rate_per_period to each leave balance", dependencies: "PAY-001" },
  { ruleId: "PAY-004", category: "Payroll", description: "LBA auto-adjustment during payroll processing", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Pay period processing for shift workers", calculation: "Calculate scheduled vs 80hrs; auto credit/debit LBA", dependencies: "IBEW-LBA-002" },
  { ruleId: "PAY-005", category: "Payroll", description: "Payroll summary report by department and location", employeeGroup: "All", scheduleType: null, triggerCondition: "End of payroll processing", calculation: "Aggregate hours by pay code, department, location", dependencies: "PAY-001" },
  { ruleId: "PAY-006", category: "Payroll", description: "Retro pay calculation for late corrections", employeeGroup: "All", scheduleType: null, triggerCondition: "Correction to already-processed pay period", calculation: "Calculate difference; include in next pay cycle", dependencies: "AUD-005" },

  // RPT: Reporting Rules
  { ruleId: "RPT-001", category: "Reports", description: "Overtime report by employee, department, and period", employeeGroup: "All", scheduleType: null, triggerCondition: "Report request", calculation: "Sum OT hours by employee/dept for selected period", dependencies: null },
  { ruleId: "RPT-002", category: "Reports", description: "Leave usage report with YTD totals", employeeGroup: "All", scheduleType: null, triggerCondition: "Report request", calculation: "Aggregate leave hours by type, employee, YTD", dependencies: null },
  { ruleId: "RPT-003", category: "Reports", description: "Staffing/coverage report for shift schedule", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Report request", calculation: "Show coverage status per shift for date range", dependencies: null },
  { ruleId: "RPT-004", category: "Reports", description: "Compliance report: FLSA, meal/rest, rest period violations", employeeGroup: "All", scheduleType: null, triggerCondition: "Report request", calculation: "List all exceptions/violations for date range", dependencies: null },
  { ruleId: "RPT-005", category: "Reports", description: "Payroll cost report by location and cost code", employeeGroup: "All", scheduleType: null, triggerCondition: "Report request", calculation: "Aggregate pay by location, cost code, pay code", dependencies: null },
  { ruleId: "RPT-006", category: "Reports", description: "Audit trail report for selected entity/period", employeeGroup: "All", scheduleType: null, triggerCondition: "Report request", calculation: "Filter audit_log by entity_type, date range, user", dependencies: null },

  // Additional IBEW leave-specific rules
  { ruleId: "IBEW-LV-001", category: "Leave", description: "Vacation accrual based on years of service tier", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Pay period accrual", calculation: "Tier 1 (0-5yr): 4.62hr/pp, Tier 2 (5-10yr): 6.0hr/pp, Tier 3 (10+yr): 7.38hr/pp", dependencies: null },
  { ruleId: "IBEW-LV-002", category: "Leave", description: "Sick leave accrual: 6.0 hours per pay period", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Pay period accrual", calculation: "6.0 hours added to sick balance each pay period", dependencies: null },
  { ruleId: "IBEW-LV-003", category: "Leave", description: "Vacation cap at 360 hours (15 shifts)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Vacation balance check", calculation: "Stop accrual if balance >= 360 hours", dependencies: "IBEW-LV-001" },
  { ruleId: "IBEW-LV-004", category: "Leave", description: "Float days: 2 per year (24 hours for 12-hr workers)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Calendar year start", calculation: "Credit 24 hours (2 x 12hr shifts) on Jan 1", dependencies: null },
  { ruleId: "IBEW-LV-005", category: "Leave", description: "Bereavement leave: 3-5 days depending on relationship per CBA", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Bereavement request", calculation: "3 days (immediate family) or 5 days (spouse/child/parent)", dependencies: null },
  { ruleId: "IBEW-LV-006", category: "Leave", description: "Jury duty: full pay for duration; shift coverage arranged", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Jury duty notification", calculation: "Regular pay for jury days; arrange relief coverage", dependencies: null },

  // Additional HEA leave rules
  { ruleId: "HEA-LV-001", category: "Leave", description: "Vacation accrual by service tier for HEA employees", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Pay period accrual", calculation: "Tier 1: 3.08hr/pp, Tier 2: 4.62hr/pp, Tier 3: 6.15hr/pp", dependencies: null },
  { ruleId: "HEA-LV-002", category: "Leave", description: "Sick leave accrual for HEA: 3.69 hours per pay period", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Pay period accrual", calculation: "3.69 hours added each pay period", dependencies: null },
  { ruleId: "HEA-LV-003", category: "Leave", description: "Vacation cap at 240 hours for HEA employees", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Vacation balance check", calculation: "Stop accrual if balance >= 240 hours", dependencies: "HEA-LV-001" },
  { ruleId: "HEA-LV-004", category: "Leave", description: "Float days: 2 per year (16 hours for 8-hr workers)", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Calendar year start", calculation: "Credit 16 hours (2 x 8hr days) on Jan 1", dependencies: null },
  { ruleId: "HEA-LV-005", category: "Leave", description: "CA Paid Sick Leave: minimum 40 hours/year available", employeeGroup: "HEA", scheduleType: null, triggerCondition: "Annual sick leave check", calculation: "Ensure minimum 40 hours available per CA law", dependencies: null },

  // NCPA-specific holiday rules
  { ruleId: "HOL-001", category: "Holidays", description: "NCPA designated holidays: 13 per year", employeeGroup: "All", scheduleType: null, triggerCondition: "Holiday calendar", calculation: "New Year, MLK, Presidents, Cesar Chavez, Memorial, Independence, Labor, Veterans, Thanksgiving(2), Christmas Eve, Christmas, New Year Eve", dependencies: null },
  { ruleId: "HOL-002", category: "Holidays", description: "Holiday on scheduled workday: paid day off at regular rate", employeeGroup: "All", scheduleType: null, triggerCondition: "Holiday falls on scheduled workday", calculation: "Scheduled hours paid at base rate; no work required", dependencies: "HOL-001" },
  { ruleId: "HOL-003", category: "Holidays", description: "Holiday on off day: credit to holiday bank (shift workers)", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Holiday falls on scheduled off day", calculation: "Credit 12 hours to holiday_bank balance", dependencies: "HOL-001" },
  { ruleId: "HOL-004", category: "Holidays", description: "Holiday worked by shift worker: premium pay + holiday bank credit", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Shift worker works on designated holiday", calculation: "Regular pay + holiday premium; credit holiday bank", dependencies: "HOL-001" },
  { ruleId: "HOL-005", category: "Holidays", description: "Floating holiday must be used in calendar year", employeeGroup: "All", scheduleType: null, triggerCondition: "Float balance check at year end", calculation: "Unused float hours expire Dec 31; no carryover", dependencies: null },

  // California-specific rules
  { ruleId: "CA-001", category: "CA Compliance", description: "CA daily overtime: >8 hours at 1.5x for non-exempt", employeeGroup: "All", scheduleType: null, triggerCondition: "Non-exempt daily hours > 8", calculation: "Hours 8-12: 1.5x rate", dependencies: null },
  { ruleId: "CA-002", category: "CA Compliance", description: "CA daily double-time: >12 hours at 2.0x for non-exempt", employeeGroup: "All", scheduleType: null, triggerCondition: "Non-exempt daily hours > 12", calculation: "Hours over 12: 2.0x rate", dependencies: "CA-001" },
  { ruleId: "CA-003", category: "CA Compliance", description: "CA 7th consecutive day: first 8 hours at 1.5x, over 8 at 2.0x", employeeGroup: "All", scheduleType: null, triggerCondition: "7th consecutive day worked in workweek", calculation: "First 8hrs: 1.5x, Over 8hrs: 2.0x", dependencies: null },
  { ruleId: "CA-004", category: "CA Compliance", description: "CA alternative workweek agreement (4/10) exemption from daily OT", employeeGroup: "HEA", scheduleType: "4_10", triggerCondition: "Employee on approved alternative workweek", calculation: "No daily OT until hours > 10 on scheduled day", dependencies: null },
  { ruleId: "CA-005", category: "CA Compliance", description: "CA meal period: 30-min unpaid by 5th hour (waivable for 12-hr shift)", employeeGroup: "All", scheduleType: null, triggerCondition: "Shift > 5 hours", calculation: "Meal period required; waiver valid for shifts > 12hrs", dependencies: null },
  { ruleId: "CA-006", category: "CA Compliance", description: "CA rest period: 10-min paid per 4 hours worked", employeeGroup: "All", scheduleType: null, triggerCondition: "Shift >= 4 hours", calculation: "One 10-min rest per 4 hours; paid time", dependencies: null },
  { ruleId: "CA-007", category: "CA Compliance", description: "CA Paid Family Leave: eligible after 12 months", employeeGroup: "All", scheduleType: null, triggerCondition: "PFL request", calculation: "State benefit; coordinate with NCPA leave policies", dependencies: null },

  // Additional scheduling rules
  { ruleId: "SCH-001", category: "Scheduling", description: "Schedule published 30 days in advance", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Schedule generation deadline", calculation: "Generate and publish 30+ days before effective date", dependencies: null },
  { ruleId: "SCH-002", category: "Scheduling", description: "Schedule change notification within 72 hours", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Schedule modification < 72 hours before shift", calculation: "Premium notification required; possible penalty pay", dependencies: null },
  { ruleId: "SCH-003", category: "Scheduling", description: "Shift swap requests require supervisor approval", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Shift swap request submitted", calculation: "Both employees agree; supervisor approves; no OT generated", dependencies: null },
  { ruleId: "SCH-004", category: "Scheduling", description: "Relief operator assignment priority by seniority", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Coverage needed", calculation: "Offer to relief operators by seniority order", dependencies: "IBEW-CO-002" },
  { ruleId: "SCH-005", category: "Scheduling", description: "Training schedule coordination: maintain minimum staffing", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Training assignment for shift worker", calculation: "Verify minimum staffing maintained; arrange coverage", dependencies: "IBEW-CO-001" },

  // Notification rules
  { ruleId: "NOT-001", category: "Notifications", description: "Timesheet submitted: notify supervisor", employeeGroup: "All", scheduleType: null, triggerCondition: "Timesheet status -> submitted", calculation: "Create notification for supervisor", dependencies: null },
  { ruleId: "NOT-002", category: "Notifications", description: "Timesheet approved/rejected: notify employee", employeeGroup: "All", scheduleType: null, triggerCondition: "Timesheet status -> approved/rejected", calculation: "Create notification for employee", dependencies: null },
  { ruleId: "NOT-003", category: "Notifications", description: "Leave request submitted: notify approver", employeeGroup: "All", scheduleType: null, triggerCondition: "Leave request created", calculation: "Create notification for approver", dependencies: null },
  { ruleId: "NOT-004", category: "Notifications", description: "Leave request decided: notify employee", employeeGroup: "All", scheduleType: null, triggerCondition: "Leave request status -> approved/rejected", calculation: "Create notification for employee", dependencies: null },
  { ruleId: "NOT-005", category: "Notifications", description: "Schedule change: notify affected employee", employeeGroup: "All", scheduleType: null, triggerCondition: "Schedule entry modified", calculation: "Create notification for affected employee", dependencies: null },
  { ruleId: "NOT-006", category: "Notifications", description: "Overtime alert: notify supervisor when employee approaches threshold", employeeGroup: "All", scheduleType: null, triggerCondition: "Employee OT hours approaching threshold", calculation: "Create priority notification for supervisor", dependencies: "EXC-002" },

  // Additional pay-code specific rules
  { ruleId: "PC-001", category: "Pay Codes", description: "Standby pay: 25% of base rate for on-call hours", employeeGroup: "IBEW 1245", scheduleType: "12_hour_rotating", triggerCondition: "Employee on standby status", calculation: "Standby hours x (base rate x 0.25)", dependencies: null },
  { ruleId: "PC-002", category: "Pay Codes", description: "Travel time: paid at regular rate for required travel", employeeGroup: "All", scheduleType: null, triggerCondition: "Required work travel", calculation: "Travel hours at base rate", dependencies: null },
  { ruleId: "PC-003", category: "Pay Codes", description: "Training pay: regular rate for mandatory training", employeeGroup: "All", scheduleType: null, triggerCondition: "Mandatory training assignment", calculation: "Training hours at base rate", dependencies: null },
  { ruleId: "PC-004", category: "Pay Codes", description: "Premium pay: additional rate for hazardous work", employeeGroup: "IBEW 1245", scheduleType: null, triggerCondition: "Hazardous work assignment", calculation: "Hours x (base rate + hazard premium per CBA)", dependencies: null },

  // ADP integration rules
  { ruleId: "ADP-001", category: "ADP Integration", description: "Pay code mapping: internal codes to ADP earning codes", employeeGroup: "All", scheduleType: null, triggerCondition: "ADP export generation", calculation: "Map REG->REG, OT_1_5->OT15, OT_2_0->OT20, VAC->VAC, etc.", dependencies: null },
  { ruleId: "ADP-002", category: "ADP Integration", description: "Employee ID mapping: NCPA ID to ADP file number", employeeGroup: "All", scheduleType: null, triggerCondition: "ADP export generation", calculation: "Map internal employee_id to ADP file number", dependencies: "ADP-001" },
  { ruleId: "ADP-003", category: "ADP Integration", description: "Export validation: verify all hours balanced before export", employeeGroup: "All", scheduleType: null, triggerCondition: "Pre-export validation", calculation: "Sum pay code hours == total hours; flag discrepancies", dependencies: "ADP-001" },
  { ruleId: "ADP-004", category: "ADP Integration", description: "Export file format: CSV with ADP-required column layout", employeeGroup: "All", scheduleType: null, triggerCondition: "Export file generation", calculation: "Generate CSV: FileNo, EarnCode, Hours, CostCenter, Date", dependencies: "ADP-003" },
  { ruleId: "ADP-005", category: "ADP Integration", description: "Export audit: log every export with timestamp and record count", employeeGroup: "All", scheduleType: null, triggerCondition: "ADP export completed", calculation: "Create audit entry: export_timestamp, record_count, file_hash", dependencies: "ADP-004" },
];

let payRuleCount = 0;
for (const rule of payRulesData) {
  insertPayRule.run(
    rule.ruleId,
    rule.category,
    rule.description,
    rule.employeeGroup,
    rule.scheduleType,
    rule.triggerCondition,
    rule.calculation,
    rule.dependencies,
    1
  );
  payRuleCount++;
}

console.log(`Seeded ${payRuleCount} pay rules.`);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const insertNotification = sqlite.prepare(`
  INSERT INTO notifications (user_id, type, title, message, is_read, created_at, link_to)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const notificationData = [
  // Supervisor notifications (Mark D)
  { userId: employeeNameToId["Mark D"], type: "timesheet_submitted", title: "Timesheet Submitted", message: "Aaron S submitted timesheet for 7/1-7/15", isRead: false, createdAt: "2024-07-15T17:00:00", linkTo: "/dashboard/approvals" },
  { userId: employeeNameToId["Mark D"], type: "timesheet_submitted", title: "Timesheet Submitted", message: "Jerry P submitted timesheet for 7/1-7/15", isRead: false, createdAt: "2024-07-16T06:30:00", linkTo: "/dashboard/approvals" },
  { userId: employeeNameToId["Mark D"], type: "leave_request", title: "Leave Request", message: "Kyle M requested vacation 7/22-7/25 (48 hours)", isRead: false, createdAt: "2024-07-10T09:00:00", linkTo: "/dashboard/approvals" },
  { userId: employeeNameToId["Mark D"], type: "leave_request", title: "Leave Request", message: "Steve A requested vacation 8/5-8/9 (60 hours)", isRead: true, createdAt: "2024-07-08T11:00:00", linkTo: "/dashboard/approvals" },
  { userId: employeeNameToId["Mark D"], type: "overtime_alert", title: "OT Alert", message: "Ryan D approaching OT threshold this period (36 hrs coverage)", isRead: false, createdAt: "2024-07-14T08:00:00", linkTo: "/dashboard/team" },

  // Employee notifications
  { userId: employeeNameToId["Kyle M"], type: "schedule_change", title: "Schedule Update", message: "Your schedule for July has been published", isRead: true, createdAt: "2024-06-25T10:00:00", linkTo: "/dashboard/schedule" },
  { userId: employeeNameToId["Jeff H"], type: "timesheet_approved", title: "Timesheet Approved", message: "Your timesheet for 6/16-6/30 has been approved", isRead: true, createdAt: "2024-07-01T14:00:00", linkTo: "/dashboard/timesheet" },
  { userId: employeeNameToId["Ryan D"], type: "schedule_change", title: "Coverage Assignment", message: "You have been assigned coverage for Steve A 7/15-7/18", isRead: true, createdAt: "2024-07-12T09:00:00", linkTo: "/dashboard/schedule" },

  // Payroll admin notifications (Sarah Chen)
  { userId: employeeNameToId["Sarah Chen"], type: "timesheet_submitted", title: "Timesheet Submitted", message: "Michael Torres submitted timesheet for 7/1-7/15", isRead: false, createdAt: "2024-07-15T16:00:00", linkTo: "/dashboard/approvals" },
  { userId: employeeNameToId["Sarah Chen"], type: "system", title: "Pay Period Reminder", message: "Pay period 7/1-7/15 closes in 2 days. 3 timesheets pending.", isRead: false, createdAt: "2024-07-13T08:00:00", linkTo: "/dashboard/pay-period" },
];

for (const n of notificationData) {
  insertNotification.run(n.userId, n.type, n.title, n.message, n.isRead ? 1 : 0, n.createdAt, n.linkTo);
}

console.log(`Seeded ${notificationData.length} notifications.`);

// ---------------------------------------------------------------------------
// Audit Log (sample entries)
// ---------------------------------------------------------------------------
const insertAuditLog = sqlite.prepare(`
  INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_value, new_value, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const auditData = [
  { userId: employeeNameToId["Mark D"], action: "schedule_modified", entityType: "schedule", entityId: null, oldValue: '{"shift_code":"R"}', newValue: '{"shift_code":"C","notes":"Ryan D covering Steve A"}', createdAt: "2024-07-12T09:00:00" },
  { userId: employeeNameToId["Mark D"], action: "leave_request_approved", entityType: "leave_request", entityId: 5, oldValue: '{"status":"pending"}', newValue: '{"status":"approved"}', createdAt: "2024-05-21T09:00:00" },
  { userId: employeeNameToId["Mark D"], action: "timesheet_approved", entityType: "timesheet", entityId: 3, oldValue: '{"status":"submitted"}', newValue: '{"status":"approved"}', createdAt: "2024-07-01T14:00:00" },
  { userId: employeeNameToId["Sarah Chen"], action: "timesheet_approved", entityType: "timesheet", entityId: 4, oldValue: '{"status":"submitted"}', newValue: '{"status":"approved"}', createdAt: "2024-07-02T09:00:00" },
  { userId: employeeNameToId["Mark D"], action: "leave_request_rejected", entityType: "leave_request", entityId: 8, oldValue: '{"status":"pending"}', newValue: '{"status":"rejected","notes":"Insufficient coverage"}', createdAt: "2024-06-11T08:00:00" },
];

for (const a of auditData) {
  insertAuditLog.run(a.userId, a.action, a.entityType, a.entityId, a.oldValue, a.newValue, a.createdAt);
}

console.log(`Seeded ${auditData.length} audit log entries.`);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
sqlite.close();
console.log("\nSeed complete! Database created at:", dbPath);
