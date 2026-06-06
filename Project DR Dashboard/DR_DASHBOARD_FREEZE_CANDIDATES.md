# DR Dashboard Freeze Candidates

This file groups the current dashboard-related changes into practical buckets so we can isolate a clean freeze baseline.

## Recommended Strategy

Create the freeze baseline in two passes:

1. isolate dashboard product files
2. decide whether this freeze is `UI-only` or `dashboard-full`

For the current repo state, the safest interpretation is:

- `UI-only freeze`: only presentation and page composition
- `dashboard-full freeze`: dashboard UI plus dashboard logic/data files

Do not include KB refreshes, ingestion scripts, or unrelated project assets in either freeze unless we explicitly want a broader snapshot.

## Bucket A: Safe For UI-Only Freeze

These are the best candidates if the goal is "logic is done, now we polish visuals only".

- `apps/web/app/page.css`
- `apps/web/app/dr-new/components/dr-new-shell.tsx`
- `apps/web/app/dr-new/components/calendar-workspace.tsx`
- `apps/web/app/dr-new/components/compare-workspace.tsx`
- `apps/web/app/dr-new/components/detail-evidence-tabs.tsx`
- `apps/web/app/dr-new/components/dividend-center-workspace.tsx`
- `apps/web/app/dr-new/components/global-ticker-search.tsx`
- `apps/web/app/dr-new/components/rankings-workspace.tsx`
- `apps/web/app/dr-new/components/screener-workspace.tsx`
- `apps/web/app/dr-new/components/watchlist-workspace.tsx`
- `apps/web/app/dr-new/page.tsx`
- `apps/web/app/dr-new/[ticker]/page.tsx`
- `apps/web/app/dr-new/calendar/page.tsx`
- `apps/web/app/dr-new/compare/page.tsx`
- `apps/web/app/dr-new/learn/page.tsx`
- `apps/web/app/dr-new/rankings/page.tsx`
- `apps/web/app/dr-new/watchlist/page.tsx`

Review before freezing:

- confirm no file above changed business logic
- confirm any edits were layout, copy, visual hierarchy, or view composition only

## Bucket B: Dashboard Logic Files

These are still dashboard-specific, but they affect behavior, mapping, or derived data. Include them only if we want a full dashboard baseline, not a UI-only freeze.

- `apps/web/app/dr-new/data/calendar-events.ts`
- `apps/web/app/dr-new/data/chart-data.ts`
- `apps/web/app/dr-new/data/data-qa.ts`
- `apps/web/app/dr-new/data/dividend-events.ts`
- `apps/web/app/dr-new/data/selectors.ts`
- `apps/web/app/dr-new/data/thai-drs.ts`
- `apps/web/app/dr-new/data/types.ts`
- `apps/web/app/dr-new/data/underlying-aliases.ts`
- `apps/web/app/dr-new/data/underlyings.ts`
- `apps/web/app/dr-new/underlying-eod-quotes.ts`

Recommended rule:

- if the dashboard behavior is already approved, freeze these with a dedicated `dashboard-full` baseline
- if we want to keep polishing only the surface, do not change these after the freeze

## Bucket C: Data And Pipeline Files To Exclude From UI Freeze

These are important, but they are not part of a clean UI-only freeze and can create noisy baselines.

- `KB/dr_dividends.json`
- `KB/dr_historical_trading_summary.json`
- `KB/dr_profile_enrichment.json`
- `KB/underlying_earnings.json`
- `KB/underlying_fundamentals.json`
- `KB/underlying_identity_master.json`
- `KB/underlying_latest_eod_merge_report.json`
- `KB/underlying_price_history.json`
- `KB/underlying_price_history_short.json`
- `scripts/build_underlying_enrichment.py`
- `scripts/fetch_underlying_latest_eod_snapshot_yfinance.py`
- `package.json`

Why exclude them:

- they broaden the baseline beyond the dashboard
- they make future UI diffs harder to read
- they can mix presentation work with data refresh history

## Bucket D: New Freeze Support Files

These files support the freeze process itself and are safe to keep.

- `DR_DASHBOARD_FREEZE_WORKFLOW.md`
- `scripts/freeze_dr_dashboard_ui_only.sh`
- `DR_DASHBOARD_FREEZE_CANDIDATES.md`

## Suggested Baselines

### Option 1: UI-Only Freeze

Include:

- Bucket A
- Bucket D

Exclude:

- Bucket B
- Bucket C

Best when:

- logic is stable
- taxonomy and ranking are already approved
- the next phase is purely premium visual polish

### Option 2: Dashboard-Full Freeze

Include:

- Bucket A
- Bucket B
- Bucket D

Exclude:

- Bucket C

Best when:

- we want to lock the entire current dashboard behavior
- we want one exact baseline before a bigger redesign pass

## Practical Next Step

Before creating the freeze commit, inspect only dashboard-scoped changes with commands like:

```bash
git diff -- apps/web/app/dr-new apps/web/app/page.css
git diff -- apps/web/app/dr-new/data
git diff -- KB
```

Then choose one:

- `UI-only freeze`: stage Bucket A and Bucket D only
- `dashboard-full freeze`: stage Bucket A, Bucket B, and Bucket D only

Helper command:

```bash
./scripts/stage_dr_dashboard_freeze.sh ui-only
./scripts/stage_dr_dashboard_freeze.sh dashboard-full
```

## My Recommendation For This Repo

Given the current worktree, I recommend:

1. create a `dashboard-full` checkpoint first if the behavior is truly stable
2. tag it as the last approved logic baseline
3. branch into `ui-polish` and only touch Bucket A after that

That gives us the safest separation between "approved behavior" and "premium visual iteration".
