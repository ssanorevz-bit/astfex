import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path


def previous_business_day(date_text: str) -> str:
    value = datetime.strptime(date_text, "%Y-%m-%d").date() - timedelta(days=1)
    while value.weekday() >= 5:
        value -= timedelta(days=1)
    return value.isoformat()


def main():
    parser = argparse.ArgumentParser(description="Evaluate whether underlying snapshot should retry on an earlier trade date")
    parser.add_argument("--report-path", required=True)
    parser.add_argument("--current-trade-date", required=True)
    parser.add_argument("--stale-ratio-threshold", type=float, default=0.6)
    parser.add_argument("--min-stale-count", type=int, default=25)
    args = parser.parse_args()

    report_path = Path(args.report_path)
    payload = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}

    total_requested = int(payload.get("totalRequested") or 0)
    success_count = int(payload.get("successCount") or 0)
    stale_count = int(payload.get("staleCount") or 0)
    failed_count = int(payload.get("failedCount") or 0)
    stale_ratio = (stale_count / success_count) if success_count > 0 else 0.0

    should_retry = (
        success_count > 0
        and stale_count >= args.min_stale_count
        and stale_ratio >= args.stale_ratio_threshold
        and failed_count < total_requested
    )

    result = {
        "shouldRetry": should_retry,
        "currentTradeDate": args.current_trade_date,
        "nextTradeDate": previous_business_day(args.current_trade_date) if should_retry else None,
        "reason": "broad_stale_ratio" if should_retry else "not_needed",
        "staleRatio": stale_ratio,
        "staleCount": stale_count,
        "successCount": success_count,
        "failedCount": failed_count,
        "totalRequested": total_requested,
        "thresholds": {
            "staleRatioThreshold": args.stale_ratio_threshold,
            "minStaleCount": args.min_stale_count,
        },
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
