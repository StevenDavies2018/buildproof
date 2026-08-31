---
title: How Many Backers Do You Actually Need to Succeed on Kickstarter?
description: We pulled median backer counts for every successful Kickstarter campaign in Backer Sonar's dataset, broken down by goal size, so you can see roughly how many backers a campaign like yours typically needs.
publishedAt: "2026-08-31"
---

Goal size gets most of the attention when people plan a Kickstarter, but the number that actually decides whether you fund is backers: enough people pledging enough money, before the clock runs out. So for a given goal, how many backers does that usually take?

We pulled every successful campaign in Backer Sonar's dataset and looked at backer counts by goal size in USD.

## Typical backer count, by goal size

| Goal range | Successful campaigns | Median backers | Typical range (25th–75th percentile) |
| --- | --- | --- | --- |
| Under $1,000 | 27,012 | 26 | 14 – 60 |
| $1,000–$4,999 | 37,828 | 52 | 31 – 94 |
| $5,000–$14,999 | 27,500 | 111 | 65 – 209 |
| $15,000–$49,999 | 12,513 | 222 | 127 – 428 |
| $50,000–$149,999 | 2,472 | 639 | 304 – 1,336 |
| $150,000+ | 295 | 2,207 | 1,309 – 5,081 |

Backer count scales with goal size, but not in a straight line — it roughly doubles at each step up through the first three brackets, then accelerates faster at the high end. A $150,000+ campaign typically needs about 85x the backers of a sub-$1,000 campaign, not 150x, which tells you something: bigger campaigns also tend to pull higher average pledges per backer, not just more backers.

## Overall, successful vs. unsuccessful

Across the full dataset, regardless of goal size:

- **Successful campaigns**: median of **69 backers**
- **Unsuccessful campaigns**: median of just **3 backers**

That gap is the clearest single signal in the data. Campaigns that stall almost always stall early and stay small — they aren't usually "close" campaigns that got 40 backers and fell just short. Most failed campaigns barely got off the ground at all.

## Success rate by final backer count

This next view is a useful sanity check, not a target to aim for — final backer count is an outcome, not something you control directly the way you control your goal. But it's a stark way to see the same pattern:

| Final backers | Campaigns | Success rate |
| --- | --- | --- |
| Under 10 | 58,632 | 8.2% |
| 10–24 | 25,347 | 61.5% |
| 25–49 | 25,743 | 83.6% |
| 50–99 | 26,533 | 91.9% |
| 100–249 | 24,622 | 95.9% |
| 250–499 | 9,368 | 97.4% |
| 500+ | 8,626 | 99.3% |

Somewhere between 10 and 50 backers is where the odds flip from "likely to fail" to "likely to succeed" — but treat this table as a mirror, not a plan. Backer count and success are mechanically linked (more backers pledging usually *is* what clears the goal), so this mostly confirms the obvious rather than predicting it.

## What this doesn't prove

- **This isn't causal.** Setting a smaller goal doesn't cause you to need fewer backers in some deep sense — you need fewer backers because you need less total money. The real planning question is whether *you* can realistically reach the backer count implied by *your* goal.
- **These are medians across every category.** A hardware campaign and a TTRPG book campaign can have very different typical pledge sizes, which changes how many backers a given goal actually requires. See our [TTRPG subcategory breakdown](/blog/ttrpg-kickstarter-subcategories-by-success-rate) for a narrower slice.
- **This says nothing about how to *get* those backers** — audience building, pre-launch list size, and outside traffic aren't in this dataset. This only tells you what successful campaigns' backer counts looked like after the fact.

## What this is useful for

If you already have a goal in mind, this table gives you a rough, honest benchmark: successful campaigns at your goal size typically needed somewhere in the 25th–75th percentile range shown above. If that backer count feels unreachable given the audience you're starting with, that's a real signal worth weighing — alongside, not instead of, the [goal-size success-rate breakdown](/blog/does-a-lower-kickstarter-goal-increase-your-odds) we published separately.

You can explore backer counts yourself, filtered by category and time window, in [Backer Sonar's research dashboard](/dashboard).
