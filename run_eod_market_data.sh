#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

export DR_DASHBOARD_DR_FOLDER="$ROOT_DIR/Project DR Dashboard/DR EOD"

DATE_ARG="${1:-}"
if [[ "$DATE_ARG" == "--date" ]]; then
  DATE_VALUE="${2:-}"
elif [[ -n "$DATE_ARG" ]]; then
  DATE_VALUE="$DATE_ARG"
else
  DATE_VALUE="$(date +%F)"
fi

DR_DASH="/Users/ratchaphop/Developer/Quant-S/Project DR Dashboard"
UNDERLYING_EOD_RESOLUTION_JSON="$(python3 "$DR_DASH/scripts/resolve_underlying_eod_date.py" --run-date "$DATE_VALUE" --json)"
DEFAULT_UNDERLYING_EOD_DATE="$(python3 - <<PY
import json
payload = json.loads("""$UNDERLYING_EOD_RESOLUTION_JSON""")
print(payload["resolvedDate"])
PY
)"
UNDERLYING_EOD_REASON="$(python3 - <<PY
import json
payload = json.loads("""$UNDERLYING_EOD_RESOLUTION_JSON""")
print(payload["reason"])
PY
)"
UNDERLYING_EOD_REQUESTED_DATE="$(python3 - <<PY
import json
payload = json.loads("""$UNDERLYING_EOD_RESOLUTION_JSON""")
print(payload["requestedDate"])
PY
)"
UNDERLYING_EOD_DATE="${UNDERLYING_EOD_DATE:-$DEFAULT_UNDERLYING_EOD_DATE}"
UNDERLYING_EOD_INITIAL_DATE="$UNDERLYING_EOD_DATE"
UNDERLYING_EOD_RETRY_USED="false"
UNDERLYING_EOD_RETRY_REASON=""
UNDERLYING_EOD_RETRY_FROM=""
UNDERLYING_EOD_RETRY_TO=""
UNDERLYING_SNAPSHOT_REPORT="$DR_DASH/KB/underlying_latest_eod_snapshot_report.json"

RUN_DIR="$ROOT_DIR/logs/daily_runs/$DATE_VALUE"
mkdir -p "$RUN_DIR"
LOG_FILE="$RUN_DIR/eod_market_data.log"
STATUS_FILE="$RUN_DIR/eod_market_data_status.json"
rm -f "$LOG_FILE"

FAILED_STEPS=()

log_line() {
  echo "$1" | tee -a "$LOG_FILE"
}

run_step() {
  local label="$1"; shift
  log_line "  ▶ $label"
  if "$@" 2>&1 | tee -a "$LOG_FILE"; then
    log_line "  ✅ $label"
  else
    local exit_code=${PIPESTATUS[0]}
    log_line "  ❌ $label FAILED (exit $exit_code) — continuing EOD pipeline"
    FAILED_STEPS+=("$label")
  fi
}

log_line "═══════════════════════════════════════════════════════════"
log_line "  📦 EOD MARKET DATA — $DATE_VALUE"
log_line "═══════════════════════════════════════════════════════════"
log_line ""

log_line "📥 Step 1/12: Options EOD Download"
run_step "options_eod_download" python3 astfex/scripts/options_regime/tfex_eod_downloader.py --date "$DATE_VALUE"
log_line ""

log_line "🗂 Step 2/12: Distribute Options EOD Parquet"
run_step "options_eod_distribute" python3 distribute_eod_parquet.py --date "$DATE_VALUE"
log_line ""

log_line "📉 Step 3/12: Short Sales Fetch + Sync"
run_step "short_sales_fetch" python3 -c "from daily_morning_fetch import fetch_short_sales, make_set_session; ok = fetch_short_sales('$DATE_VALUE', make_set_session()); print('Short Sales:', '✅' if ok else '⚠️  No data (holiday?)')"
run_step "short_sales_sync" python3 update_ss_eod_ma.py
log_line ""

log_line "📥 Step 4/12: SSF Daily Value + Canonical Rebuild"
run_step "update_stock_day" python3 update_stock_day.py --date "$DATE_VALUE"
run_step "ssf_value_fetch" python3 fetch_ssf_value_daily.py --date "$DATE_VALUE"
run_step "ssf_value_rebuild" python3 rebuild_value_ssf_canonical.py
log_line ""

log_line "📈 Step 5/12: DR EOD & Dividends Ingest"
run_step "dr_raw_ingest" python3 /Users/ratchaphop/.gemini/antigravity/scratch/dr-dashboard/Dividends/fetch_all_dr_data_raw.py
run_step "dr_eod_csv_update" python3 /Users/ratchaphop/.gemini/antigravity/scratch/dr-dashboard/Dividends/update_dr_eod_csv.py
log_line ""

log_line "🔄 Step 6/12: Sync DR EOD → dr_database/price (for /dr-new chart)"
run_step "dr_sync_price_db" python3 "/Users/ratchaphop/Developer/Quant-S/Project DR Dashboard/sync_eod_to_price_db.py"
log_line ""

log_line "📋 Step 7/12: Import Settrade Bundle → KB (dr_profile + latest trading summary)"
run_step "dr_import_settrade_bundle" node "$DR_DASH/scripts/import_settrade_bundle.mjs"
log_line ""

log_line "💰 Step 8/12: Import Settrade Dividends → KB (dr_dividends XD calendar)"
run_step "dr_import_settrade_dividends" node "$DR_DASH/scripts/import_settrade_dividends.mjs"
log_line ""

log_line "🏗️ Step 9/12: Rebuild Underlying Enrichment KB JSONs"
run_step "dr_build_underlying_enrichment" python3 "$DR_DASH/scripts/build_underlying_enrichment.py"
log_line ""

log_line "📊 Step 10/12: Fetch Underlying Latest EOD Snapshot (yfinance target $UNDERLYING_EOD_DATE)"
run_step "underlying_latest_eod_snapshot" python3 "$DR_DASH/scripts/fetch_underlying_latest_eod_snapshot_yfinance.py" --trade-date "$UNDERLYING_EOD_DATE"
if [[ -f "$UNDERLYING_SNAPSHOT_REPORT" ]]; then
  UNDERLYING_RETRY_EVAL_JSON="$(python3 "$DR_DASH/scripts/evaluate_underlying_snapshot_fallback.py" --report-path "$UNDERLYING_SNAPSHOT_REPORT" --current-trade-date "$UNDERLYING_EOD_DATE")"
  UNDERLYING_RETRY_SHOULD_RUN="$(python3 - <<PY
import json
payload = json.loads("""$UNDERLYING_RETRY_EVAL_JSON""")
print("true" if payload["shouldRetry"] else "false")
PY
)"
  if [[ "$UNDERLYING_RETRY_SHOULD_RUN" == "true" ]]; then
    UNDERLYING_EOD_RETRY_USED="true"
    UNDERLYING_EOD_RETRY_REASON="$(python3 - <<PY
import json
payload = json.loads("""$UNDERLYING_RETRY_EVAL_JSON""")
print(payload["reason"])
PY
)"
    UNDERLYING_EOD_RETRY_FROM="$UNDERLYING_EOD_DATE"
    UNDERLYING_EOD_RETRY_TO="$(python3 - <<PY
import json
payload = json.loads("""$UNDERLYING_RETRY_EVAL_JSON""")
print(payload["nextTradeDate"])
PY
)"
    UNDERLYING_EOD_DATE="$UNDERLYING_EOD_RETRY_TO"
    log_line "  ↩ underlying snapshot broad stale fallback: $UNDERLYING_EOD_RETRY_FROM -> $UNDERLYING_EOD_RETRY_TO ($UNDERLYING_EOD_RETRY_REASON)"
    run_step "underlying_latest_eod_snapshot_retry" python3 "$DR_DASH/scripts/fetch_underlying_latest_eod_snapshot_yfinance.py" --trade-date "$UNDERLYING_EOD_DATE"
  fi
fi
log_line ""

log_line "🔗 Step 11/12: Merge Underlying Latest EOD Snapshot → Price History"
run_step "underlying_latest_eod_merge" python3 "$DR_DASH/scripts/merge_underlying_latest_eod_snapshot.py"
log_line ""

log_line "📦 Step 12/12: Compile Main DR Knowledge Base JSON"
run_step "dr_build_knowledge_base" python3 "$DR_DASH/build_dr_knowledge_base.py"
log_line ""

if [[ ${#FAILED_STEPS[@]} -eq 0 ]]; then
  FAILED_JSON="[]"
else
  FAILED_JSON=$(printf '"%s",' "${FAILED_STEPS[@]}")
  FAILED_JSON="[${FAILED_JSON%,}]"
fi

python3 - <<PY
import json
from pathlib import Path

snapshot_report_path = Path("$DR_DASH/KB/underlying_latest_eod_snapshot_report.json")
merge_report_path = Path("$DR_DASH/KB/underlying_latest_eod_merge_report.json")

def read_json_if_exists(path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))

snapshot_report = read_json_if_exists(snapshot_report_path)
merge_report = read_json_if_exists(merge_report_path)

status = {
    "trade_date": "$DATE_VALUE",
    "underlying_eod_requested_date": "$UNDERLYING_EOD_REQUESTED_DATE",
    "underlying_eod_initial_date": "$UNDERLYING_EOD_INITIAL_DATE",
    "underlying_eod_date": "$UNDERLYING_EOD_DATE",
    "underlying_eod_reason": "$UNDERLYING_EOD_REASON",
    "underlying_eod_retry_used": "$UNDERLYING_EOD_RETRY_USED" == "true",
    "underlying_eod_retry_reason": "$UNDERLYING_EOD_RETRY_REASON" or None,
    "underlying_eod_retry_from": "$UNDERLYING_EOD_RETRY_FROM" or None,
    "underlying_eod_retry_to": "$UNDERLYING_EOD_RETRY_TO" or None,
    "component": "eod_market_data",
    "failed_steps": json.loads("""$FAILED_JSON"""),
    "underlying_snapshot_summary": {
        "provider": snapshot_report.get("provider") if snapshot_report else None,
        "target_trade_date": snapshot_report.get("targetTradeDate") if snapshot_report else None,
        "total_requested": snapshot_report.get("totalRequested") if snapshot_report else None,
        "success_count": snapshot_report.get("successCount") if snapshot_report else None,
        "failed_count": snapshot_report.get("failedCount") if snapshot_report else None,
        "stale_count": snapshot_report.get("staleCount") if snapshot_report else None,
        "skipped_count": snapshot_report.get("skippedCount") if snapshot_report else None,
        "report_path": str(snapshot_report_path) if snapshot_report else None,
    },
    "underlying_merge_summary": {
        "symbols_in_snapshot": merge_report.get("symbolsInSnapshot") if merge_report else None,
        "symbols_in_history_after_merge": merge_report.get("symbolsInHistoryAfterMerge") if merge_report else None,
        "appended_count": merge_report.get("appendedCount") if merge_report else None,
        "updated_existing_date_count": merge_report.get("updatedExistingDateCount") if merge_report else None,
        "unchanged_existing_date_count": merge_report.get("unchangedExistingDateCount") if merge_report else None,
        "created_records_count": merge_report.get("createdRecordsCount") if merge_report else None,
        "skipped_count": merge_report.get("skippedCount") if merge_report else None,
        "report_path": str(merge_report_path) if merge_report else None,
    },
    "overall_status": "success" if """$FAILED_JSON""" == "[]" else "completed_with_failures",
}
Path("$STATUS_FILE").write_text(json.dumps(status, indent=2, ensure_ascii=True), encoding="utf-8")
print(json.dumps(status, indent=2, ensure_ascii=True))
PY

if [[ ${#FAILED_STEPS[@]} -gt 0 ]]; then
  exit 1
fi
