---
title: Does a Lower Kickstarter Goal Increase Your Odds of Success?
description: We broke down success rates across every completed Kickstarter campaign in Backer Sonar's dataset, bucketed by initial funding goal. The pattern is stark.
publishedAt: "2026-08-23"
---

If you're deciding what to ask for on Kickstarter, this is one of the first questions worth answering with real numbers instead of instinct: does asking for less money actually improve your odds of getting funded?

We ran this directly against Backer Sonar's full dataset — every completed campaign (successful or unsuccessful), bucketed by initial funding goal in USD, across all categories.

## The numbers

| Goal range | Campaigns | Success rate | Median funding multiple |
| --- | --- | --- | --- |
| Under $1,000 | 34,613 | 78.0% | 1.58x |
| $1,000–$4,999 | 56,526 | 66.9% | 1.06x |
| $5,000–$14,999 | 47,539 | 57.8% | 1.02x |
| $15,000–$49,999 | 27,839 | 44.9% | 0.27x |
| $50,000–$149,999 | 9,274 | 26.7% | 0.01x |
| $150,000+ | 3,074 | 9.6% | 0.00x |

The trend is monotonic — success rate drops at every step as the goal size increases, from 78% at the smallest bracket down to under 10% at the largest. There's no bracket where the pattern reverses.

## What this doesn't prove

This is a correlation, not a causal recommendation to "just ask for less." A few things are worth holding in mind before drawing conclusions:

- **Goal size isn't chosen at random.** Campaigns asking for $150,000+ are frequently funding genuinely expensive physical products (hardware, large print runs, tooling costs) where a smaller goal wouldn't be realistic in the first place. The goal size and the underlying project cost are entangled.
- **The median funding multiple tells a related but distinct story.** Campaigns in the smallest bracket don't just succeed more often — when they do succeed, they tend to raise multiples of their goal (1.58x median). Once goals climb past $50,000, the median multiple across *all* completed campaigns in that bracket (successes and failures together) drops close to zero, reflecting how many large-goal campaigns raise only a small fraction of what they asked for.
- **This is an all-category view.** Category-specific patterns can differ — see our [TTRPG subcategory breakdown](/blog/ttrpg-kickstarter-subcategories-by-success-rate) for a narrower slice of this same dataset.

## What this is useful for

If you're setting a goal and have flexibility in scope, this data is a reasonable input into that decision: smaller, more conservative goals have historically cleared the funding bar far more often than large ones. It's not a guarantee, and it doesn't account for what you're actually trying to build — but it's a real, current pattern across tens of thousands of campaigns, not a guess.

You can explore this breakdown yourself, filtered by category and time window, in [Backer Sonar's Goal & Duration report](/reports/structure).
