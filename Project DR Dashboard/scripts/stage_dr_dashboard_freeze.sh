#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-dashboard-full}"

UI_FILES=(
  "apps/web/app/page.css"
  "apps/web/app/dr-new/components/dr-new-shell.tsx"
  "apps/web/app/dr-new/components/calendar-workspace.tsx"
  "apps/web/app/dr-new/components/compare-workspace.tsx"
  "apps/web/app/dr-new/components/detail-evidence-tabs.tsx"
  "apps/web/app/dr-new/components/dividend-center-workspace.tsx"
  "apps/web/app/dr-new/components/global-ticker-search.tsx"
  "apps/web/app/dr-new/components/rankings-workspace.tsx"
  "apps/web/app/dr-new/components/screener-workspace.tsx"
  "apps/web/app/dr-new/components/watchlist-workspace.tsx"
  "apps/web/app/dr-new/page.tsx"
  "apps/web/app/dr-new/[ticker]/page.tsx"
  "apps/web/app/dr-new/calendar/page.tsx"
  "apps/web/app/dr-new/compare/page.tsx"
  "apps/web/app/dr-new/learn/page.tsx"
  "apps/web/app/dr-new/rankings/page.tsx"
  "apps/web/app/dr-new/watchlist/page.tsx"
)

LOGIC_FILES=(
  "apps/web/app/dr-new/data/calendar-events.ts"
  "apps/web/app/dr-new/data/chart-data.ts"
  "apps/web/app/dr-new/data/data-qa.ts"
  "apps/web/app/dr-new/data/dividend-events.ts"
  "apps/web/app/dr-new/data/selectors.ts"
  "apps/web/app/dr-new/data/thai-drs.ts"
  "apps/web/app/dr-new/data/types.ts"
  "apps/web/app/dr-new/data/underlying-aliases.ts"
  "apps/web/app/dr-new/data/underlyings.ts"
  "apps/web/app/dr-new/underlying-eod-quotes.ts"
)

SUPPORT_FILES=(
  "DR_DASHBOARD_FREEZE_WORKFLOW.md"
  "DR_DASHBOARD_FREEZE_CANDIDATES.md"
  "scripts/freeze_dr_dashboard_ui_only.sh"
  "scripts/stage_dr_dashboard_freeze.sh"
)

case "$MODE" in
  ui-only)
    FILES=("${UI_FILES[@]}" "${SUPPORT_FILES[@]}")
    ;;
  dashboard-full)
    FILES=("${UI_FILES[@]}" "${LOGIC_FILES[@]}" "${SUPPORT_FILES[@]}")
    ;;
  *)
    echo "[dr-stage] unknown mode: $MODE"
    echo "[dr-stage] use: ui-only | dashboard-full"
    exit 1
    ;;
esac

echo "[dr-stage] staging mode: $MODE"
git -C "$ROOT_DIR" reset
git -C "$ROOT_DIR" add -- "${FILES[@]}"

echo "[dr-stage] staged files:"
git -C "$ROOT_DIR" diff --cached --name-only

echo
echo "[dr-stage] unstaged files still in worktree:"
git -C "$ROOT_DIR" status --short

echo
echo "[dr-stage] next review command:"
if [[ "$MODE" == "ui-only" ]]; then
  echo "git diff --cached -- apps/web/app/dr-new apps/web/app/page.css"
else
  echo "git diff --cached -- apps/web/app/dr-new apps/web/app/page.css apps/web/app/dr-new/data"
fi
