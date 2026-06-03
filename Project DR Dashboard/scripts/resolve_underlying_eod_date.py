import argparse
import json
from datetime import datetime, timedelta


def resolve_previous_trading_date(run_date_text: str):
    run_date = datetime.strptime(run_date_text, "%Y-%m-%d").date()
    requested_date = run_date - timedelta(days=1)
    resolved_date = requested_date
    reason = "previous_calendar_day"

    while resolved_date.weekday() >= 5:
        resolved_date -= timedelta(days=1)
        reason = "rolled_back_from_weekend"

    return {
        "runDate": run_date.isoformat(),
        "requestedDate": requested_date.isoformat(),
        "resolvedDate": resolved_date.isoformat(),
        "reason": reason,
        "note": (
            "Weekend-aware resolver only. Market-specific holidays still rely on the "
            "snapshot fetcher and daily QA."
        ),
    }


def main():
    parser = argparse.ArgumentParser(description="Resolve underlying latest EOD target date")
    parser.add_argument("--run-date", required=True, help="Runner trade date in YYYY-MM-DD")
    parser.add_argument("--json", action="store_true", help="Print JSON payload instead of plain date")
    args = parser.parse_args()

    payload = resolve_previous_trading_date(args.run_date)
    if args.json:
        print(json.dumps(payload, ensure_ascii=False))
    else:
        print(payload["resolvedDate"])


if __name__ == "__main__":
    main()
