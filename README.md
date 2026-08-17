---
name: Backer Sonar
slug: backer-sonar
description: Historical Kickstarter research for evidence-based product investigation.
framework: Next.js
useCase: Internal Tool
css: Tailwind
database: Postgres
relatedTemplates:
  - postgres-prisma
  - postgres-kysely
  - postgres-sveltekit
---

# Backer Sonar

Backer Sonar is a Next.js + Neon proof of concept for researching
historical Kickstarter campaigns and evaluating product opportunities
using evidence rather than intuition alone.

## Current Scope

The current proof of concept focuses on:

- D&D / 5E / TTRPG Kickstarter campaigns
- historical research and opportunity evaluation
- category-agnostic data modeling for later expansion

The long-term system is intended to support all Kickstarter categories,
but the initial product validation work is intentionally narrower.

## Local Development

Copy `.env.example` to `.env.local` and set the Neon connection values:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
pnpm dev
```

Bootstrap the core schema:

```bash
pnpm db:bootstrap
```

Import the TTRPG proof-of-concept subset:

```bash
pnpm db:import:ttrpg
```

Check database status:

```bash
pnpm db:status
```

## Notes

- The app is being developed locally first.
- User auth and admin auth are still TODO items.
- The current Neon database is intentionally scoped to the TTRPG proof
  of concept subset.
