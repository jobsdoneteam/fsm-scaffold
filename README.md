# FSM Scaffold

White-labelable Field Service Management platform. Built with Next.js 14, Prisma, PostgreSQL, NextAuth v5, shadcn/ui, and Tailwind CSS.

## Quick Start

1. Copy `.env.example` to `.env` and fill in values
2. `docker compose up -d db` — start Postgres
3. `npm install`
4. `npm run db:push` — create tables
5. `npm run db:seed` — create admin user
6. `npm run dev` — start dev server at http://localhost:3000

## White-Labeling

Edit `config/brand.ts` only. Change name, colors, terminology, trade type, and feature flags. No other files need changing for a new client.

## Build Guide

See `docs/BUILD_CHECKLIST.md` for the full step-by-step build instructions.

## Architecture

See `docs/FSM_PLATFORM_PLAN.md` for the full architecture plan.

## Docker

`docker compose up` — runs Postgres + app together.
