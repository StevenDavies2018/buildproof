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

The current proof of concept now runs against the full Kickstarter
dataset, while the research workflows and early product validation still
center on TTRPG-heavy slices first.

Current focus:

- historical research and opportunity evaluation
- full-dataset category, subcategory, and taxonomy filtering
- category-agnostic data modeling for later expansion
- deterministic evidence-first analysis before any optional AI layer

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

## QA Checkpoint

Recent fixes and validations included:

- User View now includes the same core slice filters as Reporting:
  launch window, minimum backers, completed outcomes, and source
  completeness.
- User View taxonomy now refreshes immediately when main category or
  subcategory changes.
- A taxonomy provenance note now explains why taxonomy counts can be
  higher than final comparable-campaign totals after all filters are
  combined.
- Reporting now has a clearer empty state before a taxonomy report is
  loaded.
- Supporting campaign pagination is available in Reporting with card
  count controls and `Load next` behavior.
- Campaign detail pages preserve dashboard/report return context through
  explicit return links.
- The Account page now includes an explicit `Return to last view`
  control tied to persisted dashboard state.
- Full-dataset QA confirmed consistent slice behavior between User View
  and Reporting for representative TTRPG filters.

## Notes

- The app is being developed locally first.
- Auth is now active for local accounts plus Google sign-in.
- Email/password account creation now persists consent timestamps for
  Terms, Privacy, and Legal Disclaimer acceptance in `app_users`;
  `created_at` remains the account signup date of record.
- AI remains intentionally optional and is not part of the base
  deterministic analysis flow.
