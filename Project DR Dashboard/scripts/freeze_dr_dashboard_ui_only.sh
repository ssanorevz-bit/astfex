#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURRENT_BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"
DATE_STAMP="$(date +%Y%m%d)"
TAG_NAME="${1:-dr-dashboard-logic-freeze-$DATE_STAMP}"
BRANCH_NAME="${2:-dr-dashboard-ui-polish-$DATE_STAMP}"

if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "[dr-freeze] unable to determine current branch"
  exit 1
fi

if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
  echo "[dr-freeze] worktree is not clean"
  echo "[dr-freeze] please commit or isolate unrelated changes first"
  echo "[dr-freeze] see: $ROOT_DIR/DR_DASHBOARD_FREEZE_WORKFLOW.md"
  exit 1
fi

if git -C "$ROOT_DIR" rev-parse -q --verify "refs/tags/$TAG_NAME" >/dev/null 2>&1; then
  echo "[dr-freeze] tag already exists: $TAG_NAME"
  exit 1
fi

if git -C "$ROOT_DIR" rev-parse -q --verify "refs/heads/$BRANCH_NAME" >/dev/null 2>&1; then
  echo "[dr-freeze] branch already exists: $BRANCH_NAME"
  exit 1
fi

echo "[dr-freeze] creating logic freeze tag: $TAG_NAME"
git -C "$ROOT_DIR" tag -a "$TAG_NAME" -m "DR dashboard logic freeze from $CURRENT_BRANCH on $DATE_STAMP"

echo "[dr-freeze] creating UI polish branch: $BRANCH_NAME"
git -C "$ROOT_DIR" checkout -b "$BRANCH_NAME"

echo "[dr-freeze] done"
echo "[dr-freeze] current branch: $BRANCH_NAME"
echo "[dr-freeze] freeze tag: $TAG_NAME"
echo "[dr-freeze] next step: continue UI-only work on $BRANCH_NAME"
