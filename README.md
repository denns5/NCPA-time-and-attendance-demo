# NCPA Time & Attendance Demo

A fully functional Time & Attendance demo application built for **Northern California Power Agency (NCPA)** as part of an RFP response. Demonstrates deep understanding of NCPA's complex pay, overtime, scheduling, and leave workflows across their union and non-union employee groups.

## About NCPA

- **~180 employees** across 4 locations: Roseville HQ, Lodi Energy Center, Lake County (Geothermal), Murphys (Hydro)
- **2 union groups:** IBEW 1245 (Lodi shift operators) and HEA (general employees), plus non-union staff
- Complex scheduling with 12-hour rotating shifts, 9/80, 4/10, and standard 8/80 workweeks
- 133 business rules governing overtime, leave accrual, coverage, pay codes, and compliance

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Icons | Lucide React |

No authentication — uses a **role-selector pattern** where users pick a role (Employee, Supervisor, or Payroll Admin) on the landing page to explore the app from that perspective.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Seed the database (creates ./data/ncpa-demo.db)
npm run seed

# Start the dev server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### All Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run seed         # Recreate database with seed data
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
```

## Demo Roles & Navigation

The landing page presents three role cards. Each role sees a different set of pages in the sidebar:

| Role | Default User | Pages |
|------|-------------|-------|
| **Employee** | Kyle M (IBEW 1245 shift worker) | Timesheet, Schedule, Leave, Notifications |
| **Supervisor** | Mark D (Shift Supervisor, Lodi) | Team Dashboard, Approvals, Scheduling, Notifications |
| **Payroll Admin** | Sarah Chen (Payroll Manager, Roseville HQ) | Pay Period, Compliance, Pay Rules, Reports, ADP Export, Audit Log |

## Key Features

### Timesheet Management
Biweekly timesheet entry with support for multiple pay codes (REG, OT 1.5x, OT 2.0x, VAC, SICK, etc.) and a submit/approve/reject workflow.

### Shift Scheduling
Visual shift calendar showing the DDD-RRR-NNN-RRR 12-hour rotating pattern for IBEW operators. Supports shift modifications, coverage assignments, and open-need tracking (X codes).

### Leave Management
Leave balances, requests, sell-back, and transfers across 6 leave types: Vacation, Sick, Float, LBA (Leave Bank Accrual), Holiday Bank, and Comp Time — each with union-specific accrual rates and caps.

### Pay Rules Engine
133 configurable business rules covering overtime calculation, leave accrual, coverage pay, meal/rest penalties, reporting pay, California compliance, and more — organized by category and employee group.

### Supervisor Approvals
Unified approval queue for timesheets and leave requests with approve/reject actions.

### Compliance & Reporting
FLSA work period tracking (28-day for IBEW 7(k) exemption, 7-day for HEA), California labor law compliance checks, and exportable reports.

### ADP Integration
Export pay period data in ADP-compatible format for payroll processing.

### Audit Trail
Immutable log of all changes — approvals, modifications, and system actions with before/after JSON snapshots.

## Business Rules Overview

### Schedule Types & Overtime

| Schedule | Group | Pattern | OT Triggers |
|----------|-------|---------|-------------|
| 12-hour rotating | IBEW 1245 | DDD-RRR-NNN-RRR (28-day cycle) | >12 hrs/day @ 1.5x, >16 hrs/day @ 2.0x |
| 9/80 | HEA exempt | 9hr Mon-Thu + alternate 8hr Fri | FLSA 7-day workweek rules |
| 4/10 | HEA exempt | 10hr Mon-Thu | CA alternative workweek agreement |
| 8/80 | HEA non-exempt | 8hr Mon-Fri | >8 hrs/day or >40 hrs/week |

### Leave Types

| Type | IBEW 1245 | HEA | Notes |
|------|-----------|-----|-------|
| Vacation | Accrual by tier, 360hr cap | Accrual by tier, 240hr cap | Per pay period |
| Sick | 6.0 hr/period, no cap | 3.69 hr/period, no cap | |
| Float | 24 hrs/year | 16 hrs/year | Use-it-or-lose-it |
| LBA | Cap 120hrs | N/A | IBEW only — compensates schedule hours >80 |
| Holiday Bank | Credited on off-day holidays | N/A | IBEW only — usable as PTO |
| Comp Time | Cap 147hrs | Cap 147hrs | From specific OT situations |

### Coverage & Staffing (Lodi Energy Center)
- Minimum 2 operators per shift
- 3 relief operators (Jeff P, Ryan D, Jim M) fill vacancies
- Coverage on off day = callback OT (minimum 4 hours at 1.5x)
- `X` code on schedule = open coverage need

## Database Schema

9 tables defined in `src/db/schema.ts`:

| Table | Purpose |
|-------|---------|
| `employees` | 20 demo employees with type, schedule, location, supervisor |
| `schedules` | Day-by-day shift assignments (D/N/R/X/C/H/OFF codes) |
| `timesheets` | Biweekly records with draft/submitted/approved/rejected/processed status |
| `time_entries` | Individual time entries per day with pay codes and hours |
| `leave_balances` | Current leave bank balances with caps |
| `leave_requests` | Leave request workflow with approval status |
| `pay_rules` | 133 business rules with triggers, calculations, and dependencies |
| `audit_log` | Immutable change history with JSON before/after values |
| `notifications` | In-app alerts with read status and deep links |

## Seed Data

The seed script (`npm run seed`) populates the database with realistic demo data:

- **20 employees** — 14 Lodi IBEW shift workers + 6 staff across other locations
- **620 schedule entries** — Full July 2024 for all employees
- **7 timesheets** with 72+ time entries (mix of statuses)
- **95 leave balance records** across all leave types
- **8 leave requests** (4 pending, 3 approved, 1 rejected)
- **133 pay rules** covering all RFP Appendix D categories
- **10 notifications** and **5 audit log entries** for demo scenarios

The database file (`./data/ncpa-demo.db`) is gitignored and recreated fresh each time you run `npm run seed`.

## Project Structure

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
      notifications/page.tsx    # All roles: notifications
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
    ui/                         # shadcn/ui primitives
    sidebar.tsx                 # Role-dependent sidebar navigation
    header.tsx                  # Dashboard header with role badge
    role-card.tsx               # Landing page role selection card
  context/
    role-context.tsx            # Role + employeeId context provider
  db/
    index.ts                    # Database connection singleton
    schema.ts                   # Drizzle schema definitions
    seed.ts                     # Database seed script
  lib/
    utils.ts                    # Tailwind class merge utility
```
