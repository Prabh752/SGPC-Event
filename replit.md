# SewaSync — Gurdwara Management Portal

## Overview

SewaSync is a full-stack Gurdwara Event & Religious Calendar Management Portal built with React + Vite frontend and Express backend. It helps Prabandhak Committees manage events, sewadars (volunteers), budgets, notifications, and audit logs — all in one place with Indian Rupee (₹) currency.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/sewasync)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Currency**: Indian Rupee (₹) with Indian number formatting (en-IN locale)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Artifacts

- **sewasync** (`/`) — React frontend with full CRUD UI
- **api-server** (`/api`) — Express REST API

## Modules

1. **Dashboard** — KPI overview (events, sewadars, ₹ budget, fulfillment bar)
2. **Events** — CRUD for Gurpurabs, Diwans, Kirtan Darbar, Amrit Sanchar, Community Camp
3. **Volunteers** — Sewadar registration by department (Langar, Joda Ghar, etc.) with fulfillment progress bars
4. **Budget** — Expense log in ₹ with per-event budget health (red/green indicators)
5. **Notifications** — Broadcast to Sangat via SMS/Email with audience targeting
6. **Admin Panel** — User management (RBAC: Super Admin, Event Manager, Sewadar) + global audit log

## Database Schema

- `users` — id, username, name, role, password_hash, last_login, created_at
- `events` — id, title, date, type, volunteers_needed, estimated_budget, description, created_at
- `volunteers` — id, event_id, name, phone, department, registered_at
- `expenses` — id, event_id, description, amount, date, logged_by, created_at
- `notifications` — id, title, message, audience, channels, event_id, sent_by, sent_at
- `activity_logs` — id, user_id, action, timestamp

## API Routes

All under `/api/`:
- `GET /dashboard/summary` — dashboard stats
- `GET/POST /events`, `GET/PUT/DELETE /events/:id`, `GET /events/:id/budget-status`
- `GET/POST /volunteers`, `DELETE /volunteers/:id`, `GET /volunteers/fulfillment`
- `GET/POST /expenses`, `DELETE /expenses/:id`
- `GET/POST /notifications`
- `GET /activity-logs`
- `GET/POST /users`, `DELETE /users/:id`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
