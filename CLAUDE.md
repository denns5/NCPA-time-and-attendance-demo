# NCPA Time & Attendance Demo

## Customer Context
- **Northern California Power Agency (NCPA)** — public power agency, ~180 employees
- **4 Locations:** Roseville HQ, Lodi Energy Center, Lake County (Geothermal), Murphys (Hydro)
- **2 Unions:** IBEW 1245 (Lodi shift operators), HEA (general employees)
- **Purpose:** RFP response demo showing we understand their complex pay/OT/scheduling workflows

## Stack
- **Framework:** Next.js 14 (App Router, TypeScript, `src/` directory)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **DB File:** `./data/ncpa-demo.db` (gitignored, recreated via `npm run seed`)
- **No Auth:** Role-selector pattern — user picks Employee/Supervisor/Payroll Admin on landing page

## Key Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run seed         # Recreate database with seed data
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
```

## Database Schema (`src/db/schema.ts`)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `employees` | 20 demo employees | name, employee_type (ibew_1245/hea/non_union_*), schedule_type (12hr/9-80/4-10/8-80), location, supervisor_id |
| `schedules` | Day-by-day shift assignments | employee_id, date, shift_code (D/N/R/X/C/H/OFF), start/end_time, is_modified, notes |
| `timesheets` | Biweekly timesheet records | employee_id, pay_period_start/end, status (draft/submitted/approved/rejected/processed) |
| `time_entries` | Individual time entries per day | timesheet_id, date, pay_code (REG/OT_1_5/OT_2_0/VAC/SICK/etc), hours |
| `leave_balances` | Current leave bank balances | employee_id, leave_type (vacation/sick/float/lba/holiday_bank/comp), balance_hours, cap |
| `leave_requests` | Leave request workflow | employee_id, leave_type, dates, status (pending/approved/rejected/cancelled) |
| `pay_rules` | 133 business rules | rule_id, category, employee_group, trigger_condition, calculation, dependencies |
| `audit_log` | Immutable change history | user_id, action, entity_type, old/new_value (JSON), created_at |
| `notifications` | In-app alerts | user_id, type, title, message, is_read, link_to |

## Personas / Role Routing

| Role | Default User | ID | Sidebar Nav |
|------|-------------|-----|-------------|
| Employee | Kyle M (IBEW shift worker) | 1 | Timesheet, Schedule, Leave, Notifications |
| Supervisor | Mark D (Shift Supervisor) | 10 | Team Dashboard, Approvals, Scheduling, Notifications |
| Payroll Admin | Sarah Chen (Payroll Manager) | 15 | Pay Period, Compliance, Pay Rules, Reports, ADP Export, Audit Log |

Role context: `src/context/role-context.tsx` — stores role + employeeId, accessed via `useRole()` hook.

## Business Rules Overview

### Schedule Types & OT
- **12-hour rotating (IBEW):** DDD-RRR-NNN-RRR pattern, 28-day FLSA work period (7k exemption), OT >12hrs/day at 1.5x, >16hrs at 2.0x
- **9/80 (HEA exempt):** 9hr Mon-Thu + alternate 8hr Friday, FLSA 7-day workweek
- **4/10 (HEA exempt):** 10hr Mon-Thu, CA alternative workweek agreement
- **8/80 (HEA non-exempt):** Standard 8hr Mon-Fri, OT >8hrs/day or >40hrs/week

### Leave Types
- **Vacation:** Accrues per pay period by service tier, capped (360hr IBEW / 240hr HEA)
- **Sick:** Accrues per pay period (6.0hr IBEW / 3.69hr HEA), no cap
- **Float:** 2 days/year (24hr for 12-hr workers / 16hr for 8-hr workers), use-it-or-lose-it
- **LBA (Leave Bank Accrual):** IBEW only — compensates for schedule hours >80 in a pay period, auto-applied when <80, cap 120hrs
- **Holiday Bank:** IBEW only — credited when holiday falls on off day, usable as PTO
- **Comp Time:** Accrued from specific OT situations, cap 147hrs

### Coverage & Staffing
- Minimum 2 operators per shift at Lodi Energy Center
- Relief operators (Jeff P, Ryan D, Jim M) fill vacancies
- Coverage on off day = callback OT (min 4 hours at 1.5x)
- X code on schedule = open coverage need

### Pay Rules Engine
133 rules across categories: HEA-TU (time units), HEA-TA (approval), HEA-CW (compressed workweek), HEA-WP (work period), HEA-PC (pay codes), IBEW-WS (work schedule), IBEW-LBA (leave bank), IBEW-OT (overtime), IBEW-CO (coverage), IBEW-SP (special pay), IBEW-TR (time recording), IBEW-ML (meal/rest), IBEW-RP (reporting pay), AUD (audit), EXC (exceptions), PAY (payroll), RPT (reports), IBEW-LV/HEA-LV (leave), HOL (holidays), CA (California compliance), SCH (scheduling), NOT (notifications), PC (pay codes), ADP (integration).

## File Organization
```
src/
  app/
    page.tsx                    # Landing page — role selector
    layout.tsx                  # Root layout with RoleProvider
    dashboard/
      layout.tsx                # Dashboard shell (header + sidebar + main)
      page.tsx                  # Role-specific dashboard home
      timesheet/page.tsx        # Employee: timesheet entry
      schedule/page.tsx         # Employee: shift schedule
      leave/page.tsx            # Employee: leave management
      notifications/page.tsx    # All: notifications
      approvals/page.tsx        # Supervisor: approve timesheets/leave
      scheduling/page.tsx       # Supervisor: manage shift schedules
      team/page.tsx             # Supervisor: team overview
      pay-period/page.tsx       # Admin: pay period processing
      compliance/page.tsx       # Admin: FLSA/CA compliance
      pay-rules/page.tsx        # Admin: pay rules engine
      reports/page.tsx          # Admin: reporting
      adp-export/page.tsx       # Admin: ADP export
      audit-log/page.tsx        # Admin: audit trail
  components/
    ui/                         # shadcn/ui primitives (card, button, badge, avatar, separator)
    sidebar.tsx                 # Dashboard sidebar (role-dependent nav)
    header.tsx                  # Dashboard header (role badge, user, switch button)
    role-card.tsx               # Landing page role selection card
  context/
    role-context.tsx            # Role + employeeId context provider
  db/
    index.ts                    # Database connection singleton
    schema.ts                   # Drizzle schema (9 tables)
    seed.ts                     # Seed script (run via npm run seed)
  lib/
    utils.ts                    # cn() helper for Tailwind class merging
data/                           # SQLite database file (gitignored)
drizzle.config.ts               # Drizzle Kit configuration
```

## Seed Data Reference
- **20 employees:** 14 Lodi IBEW shift workers + 6 non-union across Roseville/Lake County/Murphys
- **620 schedule entries:** Full July 2024 for all 20 employees
- **7 timesheets** with 72+ time entries (mix of approved and submitted)
- **95 leave balance records** across all leave types
- **8 leave requests** (4 pending, 3 approved, 1 rejected)
- **133 pay rules** covering all Appendix D categories
- **10 notifications** for demo scenarios
- **5 audit log entries** showing approval/modification history

### Lodi Shift Workers
Kyle M, Aaron S, Dennis S, Jerry P, Jeff H, Ryan Y, Jeff P (relief), Daniel C, Steve A, Mark D (supervisor), Candace S, Trevor M, Ryan D (relief), Jim M (relief)

### Coverage Scenarios in Seed
- Jim M covering Jeff H on 7/2
- Ryan D covering Jeff H on 7/10-7/11 (night)
- Ryan D covering Steve A on 7/15-7/18
- Ryan D covering Aaron S (training) on 7/23-7/25
