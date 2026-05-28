# SGPC Event

SewaSync is a full-stack Gurdwara event and management portal built with React, Vite, Express, Drizzle, and pnpm workspaces. It supports event tracking, volunteer management, budget tracking, notifications, and an admin panel.

## Project Structure

- `artifacts/sewasync` - React + Vite frontend
- `artifacts/api-server` - Express API server
- `lib/db` - shared Drizzle schema and database bootstrap
- `lib/api-zod` - request and response validation schemas
- `lib/api-client-react` - generated React API client hooks
- `scripts` - workspace utilities

## Features

- Dashboard with event and budget summaries
- Calendar and event CRUD
- Volunteer registration and fulfillment tracking
- Budget and expense tracking in INR
- Notifications and audit log views
- Admin panel for user management

## Requirements

- Node.js 24
- pnpm 11+
- Git

## Install

```bash
corepack enable
corepack pnpm install
```

If your shell has trouble with the repository preinstall hook on Windows, use:

```bash
corepack pnpm install --ignore-scripts
```

## Run Locally

The project runs with the frontend on `8080` and the API on `8081`.

### API server

```bash
cd artifacts/api-server
$env:PORT="8081"
corepack pnpm run dev
```

### Frontend

```bash
cd artifacts/sewasync
$env:PORT="8080"
$env:BASE_PATH="/"
corepack pnpm run dev
```

Open the app at:

- Frontend: `http://127.0.0.1:8080/`
- API health: `http://127.0.0.1:8081/api/healthz`

## Database

The API supports two modes:

- If `DATABASE_URL` is set, it connects to PostgreSQL.
- If `DATABASE_URL` is not set, it falls back to an embedded local database with seeded demo data.

## Default Login

For local testing, use:

- Username: `admin@`
- Password: `1234567890`

## Useful Commands

```bash
corepack pnpm run build
corepack pnpm run typecheck
corepack pnpm --filter @workspace/sewasync run build
corepack pnpm --filter @workspace/api-server run build
```

## Notes

- The frontend automatically points to the local API server when opened on `localhost` or `127.0.0.1`.
- The repository is a pnpm workspace, so run commands from the repo root when possible.
