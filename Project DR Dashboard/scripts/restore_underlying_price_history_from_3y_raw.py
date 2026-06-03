import argparse
import json
from datetime import UTC, datetime
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
KB_DIR = PROJECT_DIR / "KB"

MAIN_PATH = KB_DIR / "underlying_price_history.json"
RAW_3Y_PATH = KB_DIR / "underlying_price_history_3y_raw.json"
REPORT_PATH = KB_DIR / "underlying_price_history_restore_report.json"

SYMBOL_ALIASES = {
    "JEPI ETF": "JEPI",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def iso_now():
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def clean_decimal(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return text


def normalize_row(row):
    date = row.get("date")
    close = clean_decimal(row.get("close"))
    if not date or close is None:
        return None
    normalized = {"date": str(date), "close": close}
    for key in ("open", "high", "low", "volume"):
        value = clean_decimal(row.get(key))
        if value is not None:
            normalized[key] = value
    return normalized


def normalize_history_payload(symbol: str, payload: dict, max_date: str | None):
    prices = []
    dropped_missing_close = 0
    for row in (payload or {}).get("prices") or []:
        normalized = normalize_row(row)
        if normalized is None:
            dropped_missing_close += 1
            continue
        if max_date and normalized["date"] > max_date:
            continue
        prices.append(normalized)

    by_date = {row["date"]: row for row in prices}
    ordered_prices = [by_date[date] for date in sorted(by_date)]
    if not ordered_prices:
        return None, dropped_missing_close

    normalized_symbol = SYMBOL_ALIASES.get(symbol, symbol)
    normalized_payload = {
        "underlying_symbol": normalized_symbol,
        "interval": payload.get("interval") or "1day",
        "currency": payload.get("currency"),
        "exchange": payload.get("exchange"),
        "source": payload.get("source"),
        "source_type": payload.get("source_type"),
        "source_url": payload.get("source_url"),
        "source_priority": payload.get("source_priority"),
        "as_of_date": ordered_prices[-1]["date"],
        "updated_at": iso_now(),
        "prices": ordered_prices,
    }
    return normalized_payload, dropped_missing_close


def main():
    parser = argparse.ArgumentParser(description="Restore main underlying price history from cleaned 3Y raw source")
    parser.add_argument("--max-date", default=None, help="Optional YYYY-MM-DD cap for restored rows")
    args = parser.parse_args()

    main_payload = load_json(MAIN_PATH) if MAIN_PATH.exists() else {}
    raw_payload = load_json(RAW_3Y_PATH)

    restored = dict(main_payload)
    restored_keys = []
    alias_applied = {}
    dropped_missing_close = 0

    for raw_symbol, payload in raw_payload.items():
        normalized_symbol = SYMBOL_ALIASES.get(raw_symbol, raw_symbol)
        normalized_payload, dropped = normalize_history_payload(raw_symbol, payload, args.max_date)
        dropped_missing_close += dropped
        if not normalized_payload:
            continue
        restored[normalized_symbol] = normalized_payload
        restored_keys.append(normalized_symbol)
        if normalized_symbol != raw_symbol:
            alias_applied[raw_symbol] = normalized_symbol

    write_json(MAIN_PATH, restored)

    report = {
        "generatedAt": iso_now(),
        "input": str(RAW_3Y_PATH.relative_to(PROJECT_DIR)),
        "output": str(MAIN_PATH.relative_to(PROJECT_DIR)),
        "maxDate": args.max_date,
        "restoredKeysCount": len(restored_keys),
        "symbolsInOutput": len(restored),
        "droppedRowsDueToMissingClose": dropped_missing_close,
        "symbolAliasesApplied": alias_applied,
    }
    write_json(REPORT_PATH, report)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
