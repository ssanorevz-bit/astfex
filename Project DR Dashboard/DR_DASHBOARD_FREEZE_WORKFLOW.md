# DR Dashboard Freeze Workflow

This document freezes the current DR Dashboard logic baseline so we can keep improving the visual design without drifting the underlying behavior.

## Goal

Use this workflow when:

- the dashboard logic is already stable
- the data mapping and taxonomy are already acceptable
- the next phase is mostly UI polish
- we want the freedom to redesign visuals without changing product behavior

For this project, "freeze" means:

- freeze routing behavior
- freeze filter and ranking behavior
- freeze Thai DR taxonomy usage
- freeze data source wiring
- freeze derived metric logic
- continue iterating on presentation only

## Recommended Freeze Scope

Freeze these layers:

- `apps/web/app/dr-new/data/*`
- `apps/web/app/dr-new/[ticker]/page.tsx`
- `apps/web/app/dr-new/page.tsx`
- `apps/web/app/dr-new/market-map/*`
- `apps/web/app/dr-new/dividends/*`
- `apps/web/app/dr-new/calendar/*`
- `apps/web/app/dr-new/compare/*`
- `thai_dr_taxonomy_reference.md`
- `dr_database/price/*.csv`

UI-only work after freeze should mostly stay inside:

- `apps/web/app/page.css`
- presentational React sections in `apps/web/app/dr-new/components/*`
- image assets and icons in `apps/web/public/*`

Avoid changing these during UI polish unless we explicitly reopen logic:

- selector functions
- filter logic
- sorting logic
- taxonomy references
- currency handling for market-cap ranking
- CSV ingestion
- DR-to-underlying mapping
- route semantics

## Safe Freeze Process

1. Verify current dashboard behavior.

Run the checks we rely on before marking a baseline:

```bash
npm --workspace apps/web run typecheck
./scripts/refresh_dashboard_web.sh
```

2. Make sure the worktree is clean.

Do not freeze from a noisy repo state. If unrelated work exists, either commit it separately or move it out of the way before creating the baseline.

Check:

```bash
git status --short
```

3. Create a logic-freeze checkpoint.

From a clean worktree:

```bash
git commit --allow-empty -m "freeze: DR dashboard logic baseline"
git tag -a dr-dashboard-logic-freeze-YYYYMMDD -m "DR dashboard logic freeze"
```

If the baseline changes are not committed yet, create a normal commit instead of an empty one.

4. Create a dedicated UI polish branch.

```bash
git checkout -b dr-dashboard-ui-polish-YYYYMMDD
```

5. Enforce UI-only rules while iterating.

Allowed changes:

- typography
- spacing
- card treatment
- surface/background styling
- icon treatment
- motion and transitions
- visual hierarchy
- copy inside clearly presentational sections

Not allowed without reopening logic:

- changing what a filter returns
- changing what data is shown for a metric
- changing comparison logic
- changing market-cap calculation behavior
- changing taxonomy labels or mapping rules
- changing page routing or data contract behavior

6. Verify behavior after every visual pass.

Quick regression checklist:

- DR Screener still returns the same rows for the same filters
- Market Map still uses the same taxonomy and grouping logic
- Dividends and Calendar still use the same underlying data references
- Compare still compares the same entities and metrics
- Detail page still shows the same mapped identity and issuer facts

## Naming Strategy

Use one stable tag per logic baseline:

- `dr-dashboard-logic-freeze-20260606`
- `dr-dashboard-logic-freeze-v2`

Use one main design branch per polish phase:

- `dr-dashboard-ui-polish-20260606`
- `dr-dashboard-ui-polish-phase2`

Use optional experiment branches for visual exploration:

- `dr-dashboard-ui-polish-terminal-premium`
- `dr-dashboard-ui-polish-bloomberg-light`
- `dr-dashboard-ui-polish-tradingview-clean`

Recommended rule:

- tags describe stable logic baselines
- branches describe active design work
- experiment branches should merge back into the active UI polish branch, not directly into `main`

## Current Repo Note

This repository currently carries many unrelated modified and untracked files. Because of that, the safest move is:

1. create a focused dashboard baseline commit only when the worktree is clean
2. tag that exact commit
3. branch from that tag for UI work

Do not create the freeze tag from a dirty repo state unless we intentionally want to freeze unrelated work too.

## Quick Start

If the repo is already clean, use:

```bash
./scripts/freeze_dr_dashboard_ui_only.sh
```

If the repo is not clean, clean it first and then run the script again.

If you need help staging only dashboard files from a noisy repo first, use:

```bash
./scripts/stage_dr_dashboard_freeze.sh ui-only
./scripts/stage_dr_dashboard_freeze.sh dashboard-full
```
