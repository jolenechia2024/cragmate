# CragMate Workspace

## Overview

CragMate is a climbing companion web app for Singapore-based climbers. It includes session logging, grade conversion, gym comparison, partner finding, and progress visualization.

## Stack

- **Monorepo tool**: npm workspaces
- **Node.js version**: 24
- **Package manager**: npm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/cragmate)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **Forms**: react-hook-form + @hookform/resolvers
- **Animations**: framer-motion
- **Icons**: lucide-react

## Features

1. **Grade Converter** — Convert between V-scale, Font scale, and gym color systems
2. **Session Logger** — Log climbing sessions across multiple gyms, track individual climbs per session
3. **Progress Charts** — Bar chart (sessions/month), grade distribution chart, line chart (grade progression over time)
4. **Gym Dashboard** — Compare 7 Singapore gyms: day pass prices, hours, nearest MRT, route-set day, grade system
5. **Partner Finder** — Post a planned session, find climbing partners

## Structure

```text
artifacts/
├── api-server/         # Express API server (routes: gyms, sessions, climbs, partners, stats)
└── cragmate/           # React + Vite frontend
lib/
├── api-spec/           # OpenAPI spec + Orval codegen config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
└── db/
    └── src/schema/
        ├── gyms.ts
        ├── sessions.ts
        ├── climbs.ts
        └── partnerPosts.ts
scripts/
└── src/seed-gyms.ts    # Seed script for gym data
```

## Database

PostgreSQL via Replit built-in. Tables: `gyms`, `sessions`, `climbs`, `partner_posts`.

Seed gyms: `npm --workspace @workspace/scripts run seed-gyms`
Push schema: `npm --workspace @workspace/db run push`

## API

All routes mounted under `/api`. Codegen: `npm --workspace @workspace/api-spec run codegen`

## User Identity

No auth implemented — all requests use the hardcoded `userId = "guest-user"`.
