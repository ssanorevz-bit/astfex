import argparse
import json
import re
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pandas as pd
import yfinance as yf


PROJECT_DIR = Path(__file__).resolve().parents[1]
KB_DIR = PROJECT_DIR / "KB"

IDENTITY_PATH = KB_DIR / "underlying_identity_master.json"
YAHOO_OVERRIDES_PATH = KB_DIR / "underlying_yahoo_overrides.json"
DR_PROFILE_PATH = KB_DIR / "dr_profile_enrichment.json"
SNAPSHOT_PATH = KB_DIR / "underlying_latest_eod_snapshot.json"
REPORT_PATH = KB_DIR / "underlying_latest_eod_snapshot_report.json"


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def iso_now():
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def date_text(value):
    return value.strftime("%Y-%m-%d")


def parse_numeric_hint_from_url(url):
    text = clean(url)
    if not text:
        return None
    parsed = urlparse(text)
    query = parse_qs(parsed.query)
    for key in ["sym", "symbol", "code", "topSearchStr"]:
        values = query.get(key)
        if values:
            return values[0]
    match = re.search(r"/([0-9]{3,6}[A-Z]?)(?:\D|$)", parsed.path)
    if match:
        return match.group(1)
    return None


def parse_url_symbol(url, exchange):
    text = clean(url)
    if not text:
        return None
    parsed = urlparse(text)
    query = parse_qs(parsed.query)

    for key in ["code", "sym", "symbol", "topSearchStr"]:
        values = query.get(key)
        if values and clean(values[0]):
            return clean(values[0]).upper()

    path = parsed.path or ""
    if exchange in {"NYSE", "AMEX"}:
        match = re.search(r"/quote/(?:X[A-Z]{3}|ARCX):([A-Z0-9\.\-]+)", path, flags=re.IGNORECASE)
        if match:
            return match.group(1).upper()
    if exchange == "NASDAQ":
        match = re.search(r"/(?:stocks|etf)/([a-z0-9\.\-]+)", path, flags=re.IGNORECASE)
        if match:
            return match.group(1).upper()
    if exchange == "HKEX":
        match = re.search(r"([0-9]{4,5})-hk", text, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    if exchange in {"TSE", "SSE", "SZSE", "TWSE"}:
        match = re.search(r"([0-9]{4,6}[A-Z]?)", text)
        if match:
            return match.group(1)
    if exchange == "SGX":
        match = re.search(r"code=([A-Z0-9]+)", text, flags=re.IGNORECASE)
        if match:
            return match.group(1).upper()
    return None


def parse_euronext_suffix_from_url(url):
    text = clean(url)
    if not text:
        return None
    text = text.upper()
    market_map = {
        "XAMS": "AS",
        "XPAR": "PA",
        "XBRU": "BR",
        "XLIS": "LS",
        "XOSL": "OL",
    }
    for market_code, suffix in market_map.items():
        if market_code in text:
            return suffix
    return None


def parse_tradingview_base_symbol(tradingview_symbol):
    text = clean(tradingview_symbol)
    if not text or ":" not in text:
        return None
    left = text.split("*", 1)[0]
    if ":" not in left:
        return None
    return left.split(":", 1)[1].upper()


def extract_alias_code(record):
    aliases = record.get("aliases", [])
    if not isinstance(aliases, list):
        aliases = [aliases] if aliases else []
    candidates = []
    for alias in aliases:
        text = clean(alias)
        if not text:
            continue
        for pattern in [r"\(([A-Z0-9]{2,12})\)", r"\(([0-9]{3,6}[A-Z]?)\)"]:
            match = re.search(pattern, text)
            if match:
                candidates.append(match.group(1).upper())
    for candidate in candidates:
        if candidate != "ETF":
            return candidate
    return None


def apply_exchange_suffix(base_symbol, exchange, primary_url=None):
    symbol = clean(base_symbol)
    if not symbol:
        return None
    if exchange in {"NASDAQ", "NYSE", "AMEX"}:
        return symbol
    if exchange == "EURONEXT":
        suffix = parse_euronext_suffix_from_url(primary_url) or "PA"
        return f"{symbol}.{suffix}" if re.fullmatch(r"[A-Z0-9]{1,8}", symbol) else symbol
    if exchange == "HKEX" and re.fullmatch(r"[0-9]{3,5}", symbol):
        return f"{symbol}.HK"
    if exchange == "TSE" and re.fullmatch(r"[0-9]{4}[A-Z]?", symbol):
        return f"{symbol}.T"
    if exchange == "SSE" and re.fullmatch(r"[0-9]{6}", symbol):
        return f"{symbol}.SS"
    if exchange == "SZSE" and re.fullmatch(r"[0-9]{6}", symbol):
        return f"{symbol}.SZ"
    if exchange == "TWSE" and re.fullmatch(r"[0-9]{4,6}", symbol):
        return f"{symbol}.TW"
    if exchange == "SGX" and re.fullmatch(r"[A-Z0-9]{2,5}", symbol):
        return f"{symbol}.SI"
    if exchange == "Hochiminh Stock Exchange" and re.fullmatch(r"[A-Z0-9]{3,12}", symbol):
        return f"{symbol}.VN"
    if exchange == "Deutsche Borse" and re.fullmatch(r"[A-Z0-9]{2,12}", symbol):
        return f"{symbol}.DE"
    if exchange == "Euronext Milan" and re.fullmatch(r"[A-Z0-9]{2,12}", symbol):
        return f"{symbol}.MI"
    return symbol


def derive_yahoo_symbol(record, overrides):
    underlying_symbol = record.get("underlying_symbol")
    override = overrides.get(underlying_symbol)
    if override:
        return override

    manual = clean(record.get("yahoo_symbol"))
    if manual and manual != clean(underlying_symbol):
        return manual

    exchange = clean(record.get("exchange"))
    symbol = clean(underlying_symbol)
    tradingview_symbol = clean(record.get("tradingview_symbol"))
    primary_url = clean(record.get("primary_listing_url"))
    numeric_hint = parse_numeric_hint_from_url(primary_url)
    url_symbol = parse_url_symbol(primary_url, exchange)
    tv_base_symbol = parse_tradingview_base_symbol(tradingview_symbol)
    alias_code = extract_alias_code(record)

    if symbol and (" " in symbol or symbol.endswith("ETF")):
        candidate = (
            apply_exchange_suffix(tv_base_symbol, exchange, primary_url)
            or apply_exchange_suffix(url_symbol, exchange, primary_url)
            or apply_exchange_suffix(alias_code, exchange, primary_url)
        )
        if candidate:
            return candidate

    if exchange in {"NASDAQ", "NYSE", "AMEX"} and symbol:
        if symbol == "BRKB":
            return "BRK-B"
        return (
            apply_exchange_suffix(tv_base_symbol, exchange, primary_url)
            or apply_exchange_suffix(url_symbol, exchange, primary_url)
            or apply_exchange_suffix(alias_code, exchange, primary_url)
            or symbol
        )

    if exchange in {"HKEX", "TSE", "SSE", "SZSE", "TWSE"} and numeric_hint:
        return apply_exchange_suffix(numeric_hint, exchange, primary_url)

    candidate = (
        apply_exchange_suffix(tv_base_symbol, exchange, primary_url)
        or apply_exchange_suffix(url_symbol, exchange, primary_url)
        or apply_exchange_suffix(alias_code, exchange, primary_url)
    )
    if candidate:
        return candidate

    return manual or symbol


def normalize_currency(record):
    exchange = record.get("exchange")
    value = (record.get("currency") or "").strip().upper()
    if value and not (exchange == "Hochiminh Stock Exchange" and value == "THB"):
        return value
    if exchange == "Hochiminh Stock Exchange":
        return "VND"
    if exchange == "TSE":
        return "JPY"
    if exchange == "HKEX":
        return "HKD"
    if exchange == "SGX":
        return "SGD"
    if exchange in {"SSE", "SZSE"}:
        return "CNY"
    if exchange == "TWSE":
        return "TWD"
    if exchange in {"EURONEXT", "Deutsche Borse", "Euronext Milan"}:
        return "EUR"
    return value or None


def collect_target_records():
    identity_payload = load_json(IDENTITY_PATH, {})
    yahoo_overrides = load_json(YAHOO_OVERRIDES_PATH, {})
    dr_profiles = load_json(DR_PROFILE_PATH, {})

    used_underlyings = sorted({
        (record.get("underlying") or record.get("underlying_symbol") or "").strip().upper()
        for record in dr_profiles.values()
        if (record.get("underlying") or record.get("underlying_symbol"))
    })

    rows = []
    missing = []
    for symbol in used_underlyings:
        record = identity_payload.get(symbol) or identity_payload.get(f"{symbol} ETF")
        if not record:
            missing.append(symbol)
            continue
        yahoo_symbol = derive_yahoo_symbol(record, yahoo_overrides)
        rows.append({
            "symbol": symbol,
            "record": record,
            "yahoo_symbol": yahoo_symbol,
        })
    return rows, missing


def build_snapshot(symbol, record, yahoo_symbol, history_df, fetched_at, target_date):
    if history_df.empty:
        return None

    clean_df = history_df.dropna(subset=["Close"]).sort_index()
    if clean_df.empty:
        return None

    target_ts = pd.Timestamp(target_date).tz_localize(None)
    filtered_df = clean_df[clean_df.index.tz_localize(None) <= target_ts]
    if filtered_df.empty:
        return None

    latest_idx = filtered_df.index[-1]
    latest = filtered_df.iloc[-1]
    previous = filtered_df.iloc[-2] if len(filtered_df) > 1 else None

    close = float(latest["Close"]) if pd.notna(latest["Close"]) else None
    previous_close = float(previous["Close"]) if previous is not None and pd.notna(previous["Close"]) else None
    change_pct = ((close / previous_close) - 1) * 100 if close is not None and previous_close not in (None, 0) else None

    return {
        "symbol": symbol,
        "provider": "yfinance",
        "providerSymbol": yahoo_symbol,
        "exchange": record.get("exchange"),
        "country": record.get("country") or ("VN" if record.get("exchange") == "Hochiminh Stock Exchange" else None),
        "currency": normalize_currency(record),
        "tradeDate": latest_idx.strftime("%Y-%m-%d"),
        "open": float(latest["Open"]) if pd.notna(latest["Open"]) else None,
        "high": float(latest["High"]) if pd.notna(latest["High"]) else None,
        "low": float(latest["Low"]) if pd.notna(latest["Low"]) else None,
        "close": close,
        "volume": int(latest["Volume"]) if pd.notna(latest["Volume"]) else None,
        "previousClose": previous_close,
        "changePct": change_pct,
        "fetchedAt": fetched_at,
        "status": "ok",
    }


def main():
    parser = argparse.ArgumentParser(description="Fetch latest underlying EOD snapshot from yfinance")
    parser.add_argument("--trade-date", default=(datetime.now(UTC) - timedelta(days=1)).strftime("%Y-%m-%d"))
    parser.add_argument("--pause-ms", type=int, default=250)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--symbols", default="", help="Comma-separated canonical symbols")
    args = parser.parse_args()

    rows, missing_identity = collect_target_records()
    if args.symbols:
        selected = {item.strip().upper() for item in args.symbols.split(",") if item.strip()}
        rows = [row for row in rows if row["symbol"] in selected]
    if args.limit:
        rows = rows[: args.limit]

    fetched_at = iso_now()
    target_date = args.trade_date
    snapshots = {}
    failed = []
    stale = []
    skipped = []
    success_count = 0

    for row in rows:
        symbol = row["symbol"]
        yahoo_symbol = row["yahoo_symbol"]
        if not yahoo_symbol:
            skipped.append({"symbol": symbol, "reason": "missing_yahoo_symbol"})
            continue

        try:
            history_df = yf.Ticker(yahoo_symbol).history(period="10d", interval="1d", auto_adjust=False)
        except Exception as error:
            failed.append({"symbol": symbol, "providerSymbol": yahoo_symbol, "reason": f"history_error:{error}"})
            continue

        snapshot = build_snapshot(symbol, row["record"], yahoo_symbol, history_df, fetched_at, target_date)
        if not snapshot:
            failed.append({"symbol": symbol, "providerSymbol": yahoo_symbol, "reason": "empty_history"})
            continue

        if snapshot["tradeDate"] != target_date:
            snapshot["status"] = "stale"
            stale.append({"symbol": symbol, "providerSymbol": yahoo_symbol, "tradeDate": snapshot["tradeDate"]})

        snapshots[symbol] = snapshot
        success_count += 1

        if args.pause_ms > 0:
            time.sleep(args.pause_ms / 1000)

    report = {
        "generatedAt": fetched_at,
        "mode": "live",
        "provider": "yfinance",
        "targetTradeDate": target_date,
        "totalRequested": len(rows),
        "successCount": success_count,
        "failedCount": len(failed),
        "staleCount": len(stale),
        "missingIdentityCount": len(missing_identity),
        "skippedCount": len(skipped),
        "failedSymbols": failed[:100],
        "staleSymbols": stale[:100],
        "skippedSymbols": skipped[:100],
        "missingIdentityExamples": missing_identity[:50],
        "snapshotPath": "KB/underlying_latest_eod_snapshot.json",
    }

    write_json(SNAPSHOT_PATH, snapshots)
    write_json(REPORT_PATH, report)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
