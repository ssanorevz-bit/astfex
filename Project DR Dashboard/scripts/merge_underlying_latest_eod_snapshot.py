import json
from datetime import UTC, datetime
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
KB_DIR = PROJECT_DIR / "KB"

HISTORY_PATH = KB_DIR / "underlying_price_history.json"
SNAPSHOT_PATH = KB_DIR / "underlying_latest_eod_snapshot.json"
REPORT_PATH = KB_DIR / "underlying_latest_eod_merge_report.json"

# Keep history keys aligned with the chart source keys already used in /dr-new.
NORMALIZED_SYMBOL_ALIASES = {
    "JEPI ETF": "JEPI",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def iso_now():
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def to_decimal_string(value):
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        return text or None
    text = format(float(value), "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text


def normalize_price_row(row):
    if not isinstance(row, dict):
        return None
    date = row.get("date")
    if not date:
        return None
    normalized = {"date": date}
    for key in ("open", "high", "low", "close", "volume"):
        value = to_decimal_string(row.get(key))
        if value is not None:
            normalized[key] = value
    if "close" not in normalized:
        return None
    return normalized


def normalize_history_prices(prices):
    rows = []
    for row in prices or []:
        normalized = normalize_price_row(row)
        if normalized:
            rows.append(normalized)
    by_date = {}
    for row in rows:
        by_date[row["date"]] = row
    return [by_date[date] for date in sorted(by_date)]


def infer_source_url(snapshot):
    provider = snapshot.get("provider")
    provider_symbol = snapshot.get("providerSymbol")
    if provider == "finnhub":
        return f"https://finnhub.io/docs/api/stock-candles?symbol={provider_symbol}"
    if provider == "twelvedata":
        return f"https://api.twelvedata.com/time_series?symbol={provider_symbol}&interval=1day"
    if provider == "eodhd":
        return f"https://eodhd.com/api/eod/{provider_symbol}"
    return None


def normalize_history_symbol(symbol):
    return NORMALIZED_SYMBOL_ALIASES.get(symbol, symbol)


def merge():
    history = load_json(HISTORY_PATH)
    snapshots = load_json(SNAPSHOT_PATH)
    merged = {}

    appended = 0
    updated_existing_date = 0
    unchanged_existing_date = 0
    created_records = 0
    alias_consolidated = []
    skipped = []

    for symbol, record in history.items():
        normalized_symbol = normalize_history_symbol(symbol)
        if normalized_symbol != symbol and normalized_symbol in history:
            alias_consolidated.append({"from": symbol, "to": normalized_symbol})
            continue
        merged[normalized_symbol] = record

    for symbol, snapshot in snapshots.items():
        history_symbol = normalize_history_symbol(symbol)
        trade_date = snapshot.get("tradeDate")
        close = snapshot.get("close")
        if not trade_date or close in (None, ""):
            skipped.append({"symbol": symbol, "reason": "missing_trade_date_or_close"})
            continue

        existing = merged.get(history_symbol, {})
        prices = normalize_history_prices(existing.get("prices"))
        by_date = {row["date"]: row for row in prices}

        new_row = normalize_price_row({
            "date": trade_date,
            "open": snapshot.get("open"),
            "high": snapshot.get("high"),
            "low": snapshot.get("low"),
            "close": snapshot.get("close"),
            "volume": snapshot.get("volume"),
        })
        if not new_row:
            skipped.append({"symbol": symbol, "reason": "snapshot_row_invalid"})
            continue

        previous_row = by_date.get(trade_date)
        if previous_row is None:
            by_date[trade_date] = new_row
            appended += 1
        elif previous_row != new_row:
            by_date[trade_date] = new_row
            updated_existing_date += 1
        else:
            unchanged_existing_date += 1

        sorted_dates = sorted(by_date)
        normalized_prices = [by_date[date] for date in sorted_dates]

        if history_symbol not in merged:
            created_records += 1

        merged[history_symbol] = {
            **existing,
            "underlying_symbol": existing.get("underlying_symbol") or history_symbol,
            "interval": existing.get("interval") or "1day",
            "currency": snapshot.get("currency") or existing.get("currency"),
            "exchange": snapshot.get("exchange") or existing.get("exchange"),
            "source": "provider_snapshot_merge",
            "source_type": snapshot.get("provider") or existing.get("source_type"),
            "source_url": existing.get("source_url") or infer_source_url(snapshot),
            "source_priority": existing.get("source_priority") or "latest_eod_snapshot",
            "as_of_date": trade_date,
            "updated_at": iso_now(),
            "prices": normalized_prices,
        }

    write_json(HISTORY_PATH, merged)

    report = {
        "generatedAt": iso_now(),
        "historyPath": str(HISTORY_PATH.relative_to(PROJECT_DIR)),
        "snapshotPath": str(SNAPSHOT_PATH.relative_to(PROJECT_DIR)),
        "symbolsInSnapshot": len(snapshots),
        "symbolsInHistoryAfterMerge": len(merged),
        "appendedCount": appended,
        "updatedExistingDateCount": updated_existing_date,
        "unchangedExistingDateCount": unchanged_existing_date,
        "createdRecordsCount": created_records,
        "aliasConsolidatedCount": len(alias_consolidated),
        "aliasConsolidatedExamples": alias_consolidated[:50],
        "skippedCount": len(skipped),
        "skippedExamples": skipped[:50],
    }
    write_json(REPORT_PATH, report)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    merge()
