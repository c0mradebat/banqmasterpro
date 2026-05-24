# BanqMaster Pro

A modern, full-featured **Banquet Hall Management System** built with **Next.js 14, TypeScript, Prisma, PostgreSQL, NextAuth v5**, and **Tailwind + shadcn-style UI**.

This is a ground-up rewrite of the original EJS-based BanqMaster, with everything a banquet hall actually needs:

## ✨ Features

### Operations
- **Bookings** — multi-service bookings (Marriage Hall, Dining Hall, Lawn, Swimming Pool, Shahi Bhoj, DJ Hall, Cocktail Party, Pool Party + multiple room types). Each service has its own start/end timing and rate.
- **Enquiries** — capture leads with services of interest, then convert to a booking.
- **Quotations** — quick line-item estimates before a booking is firm.
- **Calendar** — month/week/day view of every event, color-coded by status. Blackout dates render as background blocks.
- **Availability check** — pick a service + window, get conflict list with links.
- **Rooms** — live status board (Available, Occupied, Dirty, Maintenance, Reserved) with one-click status changes.
- **Customer CRM** — every customer with full booking history, lifetime value, search, blacklist flag.
- **Vendors** — caterers, decorators, event managers, DJs grouped by type.
- **Inventory** — mattresses, towels, chairs etc. with low-stock alerts.

### Finance
- **Payments** — Advance, Partial, Final, Security Deposit, Refund, Adjustment. Multiple methods (Cash, UPI, Card, Bank Transfer, Cheque).
- **Final receipt formula** — handles security-deposit logic correctly: refund what's owed, or charge what's still due.
- **Electricity meter** — start/end readings per booking auto-update consumption + charge.
- **Generator hours** + per-unit electricity rate configurable globally.
- **Add-on mattresses, misc charges** (missing towels, damages, etc.) with reasons.
- **Discounts** with reason tracking.
- **Reports & analytics** — revenue trend, top customers, revenue by service, bookings by event type.

### People & Access
- **Role-based access control** — OWNER, ADMIN, MANAGER, RECEPTIONIST, ACCOUNTANT, STAFF, DEV. Sidebar adapts to role; sensitive actions gated.
- **Staff management** with role assignment.
- **Audit log** — every create/update/delete tracked with user + timestamp.
- **PIN-based action authorization** field (schema-ready).

### UX
- **Beautiful UI** — Tailwind + shadcn-style components, dark/light theme, gradient accents, responsive everywhere.
- **Personal to-do** per user, in-app notifications, profile page.
- **Print-ready receipt** for each booking with detailed charge breakdown.
- **PWA-ready** manifest.
  
## 📸 Screenshots

### Dashboard
![Dashboard](./screenshots/ss1.png)

### Reports
![Booking Management](./screenshots/ss2.png)

### Staff
![Calendar View](./screenshots/ss3.png)
## 🧱 Stack

| Layer    | Tech                                              |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript   |
| UI       | Tailwind CSS · Radix UI · lucide-react · Sonner   |
| Forms    | react-hook-form · zod                             |
| Charts   | Recharts                                          |
| Calendar | FullCalendar                                      |
| Auth     | NextAuth v5 (Auth.js) · bcryptjs                  |
| ORM      | Prisma 5                                          |
| Database | PostgreSQL 16 (via Docker)                        |

## 🚀 Quick start

### 1. Prerequisites
- Node.js 20+
- Docker Desktop running

### 2. Install
```bash
cd banqmaster-pro
npm install
```

### 3. Spin up the database
```bash
npm run db:up      # starts Postgres + Adminer
```
Postgres → `localhost:5432` · Adminer UI → http://localhost:8080

### 4. Apply schema and seed
```bash
npm run db:push    # creates all tables
npm run db:seed    # adds users, rooms, vendors, demo booking
```

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000.

### 6. Sign in (demo accounts)
| Username     | Role         | Password   |
| ------------ | ------------ | ---------- |
| `owner`      | OWNER        | `admin123` |
| `admin`      | ADMIN        | `admin123` |
| `manager`    | MANAGER      | `admin123` |
| `reception`  | RECEPTIONIST | `admin123` |
| `accountant` | ACCOUNTANT   | `admin123` |

## 📁 Project structure
```
banqmaster-pro/
├── docker-compose.yml          Postgres + Adminer
├── prisma/
│   ├── schema.prisma           Full data model
│   └── seed.ts                 Demo data
├── src/
│   ├── app/
│   │   ├── (app)/              Authenticated app shell
│   │   │   ├── dashboard/
│   │   │   ├── bookings/       List · new · [id] · print
│   │   │   ├── enquiries/
│   │   │   ├── calendar/
│   │   │   ├── availability/
│   │   │   ├── rooms/
│   │   │   ├── customers/
│   │   │   ├── vendors/
│   │   │   ├── inventory/
│   │   │   ├── payments/
│   │   │   ├── electricity/
│   │   │   ├── quotations/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   ├── staff/
│   │   │   ├── audit/
│   │   │   ├── todos/
│   │   │   ├── notifications/
│   │   │   └── profile/
│   │   ├── login/
│   │   ├── api/auth/[...nextauth]/
│   │   └── layout.tsx
│   ├── auth.ts                 NextAuth config
│   ├── middleware.ts           Auth guard
│   ├── components/             Shared UI + ui/ primitives
│   ├── lib/
│   │   ├── db.ts               Prisma singleton
│   │   ├── rbac.ts             Role helpers
│   │   └── utils.ts
│   └── server/                 'use server' actions
│       ├── bookings.ts
│       ├── payments.ts
│       ├── enquiries.ts
│       ├── electricity.ts
│       ├── settings.ts
│       └── …
└── tailwind.config.ts
```

## 🔧 Useful commands

```bash
npm run dev            # Next dev server (port 3000)
npm run build          # Production build
npm run start          # Production server
npm run test           # Run unit tests (vitest)
npm run test:watch     # Vitest in watch mode

npm run db:up          # docker compose up -d
npm run db:down        # docker compose down
npm run db:push        # Dev-only: push schema directly (no migration history)
npm run db:migrate     # Create + apply a migration (use this in prod)
npm run db:seed        # Run prisma/seed.ts
npm run db:studio      # Prisma Studio GUI
```

### Migrations workflow

For local prototyping `db:push` is fine. For anything you want to deploy:

```bash
# After editing prisma/schema.prisma
npm run db:migrate -- --name describe_change   # creates prisma/migrations/<ts>_describe_change/
# In CI / production
npx prisma migrate deploy
```

If this repo doesn't yet have a `prisma/migrations/` folder, baseline once with:

```bash
npx prisma migrate dev --name init
```

### Backups

A daily Postgres dump script lives at `docker/backup.sh`. Wire it to cron:

```cron
0 2 * * *  cd /path/to/banqmaster-pro && ./docker/backup.sh >> ./backups/backup.log 2>&1
```

Restore with `./docker/restore.sh <backup.sql.gz>` (interactive — requires typing `RESTORE`).

## 🔐 Environment variables

`.env` (created with sensible defaults):
```
DATABASE_URL=postgresql://banqmaster:banqmaster@localhost:5432/banqmaster?schema=public
AUTH_SECRET=…
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
APP_NAME=BanqMaster Pro
DEFAULT_CURRENCY=INR
DEFAULT_TIMEZONE=Asia/Kolkata
```
For production, regenerate `AUTH_SECRET` with `openssl rand -base64 32` and switch `DATABASE_URL` to your hosted Postgres.

## 🧠 Design notes

- **Money** — all monetary fields use `Decimal(12,2)`. The pure function `computeFinancials` (in `src/lib/money.ts`) is the single source of truth for the receipt formula; `_finance.ts:recalcFinancials` re-derives `paidAmount` / `balanceDue` from the Payment table inside the same transaction as any payment write, so the cached fields on Booking are never observably stale.
- **Receipt formula** — `balance = (subtotal − discount + misc + electricity + generator + mattresses + securityDeposit) − (received − refunded)`. Negative balance ⇒ refund owed.
- **Multi-service bookings** — represented as `BookingServiceItem` rows with their own start/end. Boolean flags (`hasMarriageHall`, etc.) mirror the rows for fast filtering and analytics.
- **Auto event-type** — picking only rooms auto-sets `eventType = ROOMS_ONLY`.
- **Conflict detection** uses overlap on `BookingServiceItem` per service kind. Room-allocation conflicts use the same overlap rule on `RoomAllocation`.
- **RBAC** is implemented at three layers: sidebar visibility, page-level redirects (`userCan`), and server-action guards (`requireRole` in `src/lib/auth-guard.ts`). Every mutating server action gates by minimum role.
- **Audit log** is append-only via the `logAudit(client, args)` helper (in `src/lib/audit.ts`). Mutations inside a transaction pass the tx client so the audit row commits atomically with the change.
- **Soft delete** — `Booking` and `Payment` have `deletedAt` tombstones. `deleteCancelledBooking` and `deletePayment` set the tombstone instead of issuing a `DELETE`. All read paths filter `deletedAt: null`.
- **Login rate limit** — 8 attempts per username per 15 minutes (in-memory). Reset on successful login. Configure bypass list via `AUTH_RATE_LIMIT_BYPASS=alice,bob` for development.
- **Env validation** — `src/env.ts` validates `DATABASE_URL`, `AUTH_SECRET`, etc. with zod at boot. App refuses to start with bad config.

## 🛣 What's wired vs what's a stub

✅ Fully wired: auth, dashboard, bookings (list/new/detail/print/cancel), enquiries (list/new/detail/status), payments (record/list), calendar, availability check, rooms (status), **room allocation per booking**, customers (list/detail), vendors (list/add), inventory (list/add), electricity readings, settings (general/rates/rooms/utilities/blackouts), staff (list/add), audit log, to-dos, notifications, quotations (list/new), profile, reports.

🪛 Pre-wired with schema, ready to extend:
- Notification dispatch (currently read-only — schema is in place).
- File uploads (avatar, meter photos).
- SMS/email reminders (you can use the `Notification` table + a worker).

## 📜 License
MIT — built on top of an originally MIT-licensed AdminLTE-based project.
