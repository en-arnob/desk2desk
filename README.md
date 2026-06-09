# Desk2Desk

Internal inter-department support platform. Employees raise **Support Requests** under a category; IT staff who hold the privilege for that category see them, self-claim, work, and resolve — with everything logged for performance metrics.

> This is **not** a ticketing system. The core unit is a **Request**.

## Stack

- **API:** NestJS + Mikro-ORM + PostgreSQL
- **Web:** React + Vite + Tailwind CSS + shadcn/ui
- **Shared:** TypeScript types & enums (`@desk2desk/shared`)
- Monorepo via npm workspaces

## Structure

```
apps/
  api/      NestJS backend
  web/      React frontend
packages/
  shared/   Shared TS types & enums
```

## Getting started

```bash
npm install
cp apps/api/.env.example apps/api/.env   # fill in DB creds
npm run build:shared
npm run dev:api      # http://localhost:3000
npm run dev:web      # http://localhost:5173
```

### Database migrations & seed

```bash
npm run migration:up   --workspace @desk2desk/api
npm run seed           --workspace @desk2desk/api
```

## Roles

- **REQUESTER** — any employee; raises and confirms requests
- **SUPPORTER** — IT staff; sees & claims requests in their granted categories
- **ADMIN** — manages users, departments, categories, and category privileges

Roles are additive (a supporter can also raise requests).

## Request lifecycle

```
OPEN → CLAIMED → IN_PROGRESS → RESOLVED → CLOSED
                                   ↑           |
                                   └─ REOPENED ─┘
OPEN → CANCELLED
```

- A supporter **claims** an OPEN request (atomic — only one wins).
- Supporter moves it to IN_PROGRESS, then RESOLVED.
- The **requester confirms** to CLOSE, or REOPENs if not fixed.
