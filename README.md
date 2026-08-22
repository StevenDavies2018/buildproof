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

## Analytics Events

Backer Sonar now tracks a small counts-oriented event layer for admin
reporting. The goal is product usage visibility, not behavior scoring or
surveillance.

Currently defined events:

- `account_created`: fired after a new local account is created.
- `account_return_to_last_view`: fired when a user uses the account-page return control.
- `email_verified`: fired after a verification token is redeemed.
- `sign_in`: fired after a successful local or Google sign-in.
- `sign_out`: fired after a signed-in user ends their session.
- `page_view`: fired when a signed-in user opens Dashboard, Reporting,
  Compare, or Campaign Detail.
- `campaign_detail_opened`: fired when a campaign detail page is opened from a tracked surface.
- `dashboard_filter_applied`: fired when dashboard filters are present in
  the current slice.
- `dashboard_search_used`: fired when dashboard search text is present.
- `compare_selection_changed`: fired when a campaign is added to or removed from the compare queue.
- `report_filter_applied`: fired when reporting filters are present.
- `report_loaded`: fired when a reporting taxonomy slice is loaded.
- `report_category_card_opened`: fired when a category report card is opened.
- `report_supporting_campaign_opened`: fired when a supporting campaign is opened from Reporting.
- `saved_item_created`: fired when a research view, campaign, or
  comparison is saved.
- `saved_item_deleted`: fired when a saved item is removed.
- `saved_item_reopened`: fired when a saved research item is reopened.
- `onboarding_completed`: fired when the walkthrough is completed.
- `onboarding_skipped`: fired when the walkthrough is skipped.
- `help_opened`: fired when the Help / restart walkthrough control is
  opened.

Current admin-facing usage columns are derived from those events plus
account fields:

- `Sign-ins`: count of `sign_in`
- `Dashboard`: count of `page_view` where surface is `dashboard`
- `Reporting`: count of `page_view` where surface is `reports`
- `Details`: count of `page_view` where surface is `campaign-detail`
- `Compare views`: count of `page_view` where surface is `compare`
- `Searches`: count of `dashboard_search_used` plus
  `report_filter_applied`
- `Reports loaded`: count of `report_loaded`
- `Saved`: count of `saved_item_created`
- `Reopened`: count of `saved_item_reopened`
- `Compare picks`: count of `compare_selection_changed`
- `Return to view`: count of `account_return_to_last_view`
- `Onboarding/help usage`: count of `onboarding_completed`,
  `onboarding_skipped`, and `help_opened`
- `Account length`: days since `created_at`
- `Days to expiry`: days until `trial_ends_at` for free accounts
- `Account type`: `free` or `paid`

Recommended next events still worth adding:

- `dashboard_card_paged`: user loads the next page of campaign cards.
- `compare_view_opened`: explicit compare entry separate from generic page view.
- `taxonomy_filter_applied`: user applies a taxonomy label as an active
  filter.
- `consent_updated`: admin or user updates a consent state after account
  creation.

Recommended properties for those events:

- `surface`: `dashboard`, `reporting`, `compare`, `detail`, `account`,
  `admin`
- `category_parent`
- `category_slug`
- `taxonomy_label`
- `raw_state`
- `duration_bucket`
- `goal_range`
- `pledged_range`
- `card_page`
- `saved_item_type`
