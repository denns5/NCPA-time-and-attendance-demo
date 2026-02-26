import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  employeeType: text("employee_type", {
    enum: ["ibew_1245", "hea", "non_union_exempt", "non_union_non_exempt"],
  }).notNull(),
  scheduleType: text("schedule_type", {
    enum: ["12_hour_rotating", "9_80", "4_10", "8_80"],
  }).notNull(),
  location: text("location", {
    enum: ["lodi", "roseville_hq", "lake_county", "murphys"],
  }).notNull(),
  department: text("department").notNull(),
  jobClassification: text("job_classification").notNull(),
  hireDate: text("hire_date").notNull(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supervisorId: integer("supervisor_id").references((): any => employees.id),
  isSupervisor: integer("is_supervisor", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const schedules = sqliteTable("schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  date: text("date").notNull(),
  shiftCode: text("shift_code", {
    enum: ["D", "N", "R", "X", "C", "H", "OFF"],
  }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  isModified: integer("is_modified", { mode: "boolean" })
    .notNull()
    .default(false),
  modifiedBy: integer("modified_by"),
  notes: text("notes"),
});

export const timesheets = sqliteTable("timesheets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  payPeriodStart: text("pay_period_start").notNull(),
  payPeriodEnd: text("pay_period_end").notNull(),
  status: text("status", {
    enum: ["draft", "submitted", "approved", "rejected", "processed"],
  })
    .notNull()
    .default("draft"),
  submittedAt: text("submitted_at"),
  approvedAt: text("approved_at"),
  approvedBy: integer("approved_by"),
  rejectionReason: text("rejection_reason"),
});

export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timesheetId: integer("timesheet_id")
    .notNull()
    .references(() => timesheets.id),
  date: text("date").notNull(),
  payCode: text("pay_code", {
    enum: [
      "REG",
      "OT_1_5",
      "OT_2_0",
      "VAC",
      "SICK",
      "FLOAT",
      "HOL",
      "COMP",
      "LBA",
      "TRAIN",
      "JURY",
      "BEREAVEMENT",
      "ADMIN",
    ],
  }).notNull(),
  hours: real("hours").notNull(),
  projectCode: text("project_code"),
  costCode: text("cost_code"),
  notes: text("notes"),
  isAutoCalculated: integer("is_auto_calculated", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const leaveBalances = sqliteTable("leave_balances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  leaveType: text("leave_type", {
    enum: ["vacation", "sick", "float", "lba", "holiday_bank", "comp"],
  }).notNull(),
  balanceHours: real("balance_hours").notNull().default(0),
  accrualRatePerPeriod: real("accrual_rate_per_period").notNull().default(0),
  capHours: real("cap_hours"),
  lastAccrualDate: text("last_accrual_date"),
});

export const leaveRequests = sqliteTable("leave_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  leaveType: text("leave_type", {
    enum: ["vacation", "sick", "float", "lba", "holiday_bank", "comp"],
  }).notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalHours: real("total_hours").notNull(),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "cancelled"],
  })
    .notNull()
    .default("pending"),
  approverId: integer("approver_id").references(() => employees.id),
  submittedAt: text("submitted_at").notNull(),
  decidedAt: text("decided_at"),
  decisionNotes: text("decision_notes"),
});

export const payRules = sqliteTable("pay_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleId: text("rule_id").notNull().unique(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  employeeGroup: text("employee_group").notNull(),
  scheduleType: text("schedule_type"),
  triggerCondition: text("trigger_condition").notNull(),
  calculation: text("calculation").notNull(),
  dependencies: text("dependencies"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: text("created_at").notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => employees.id),
  type: text("type", {
    enum: [
      "timesheet_submitted",
      "timesheet_approved",
      "timesheet_rejected",
      "leave_request",
      "leave_approved",
      "leave_rejected",
      "schedule_change",
      "overtime_alert",
      "system",
    ],
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  linkTo: text("link_to"),
});
