import json
import sys
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
INGEST_DIR = PROJECT_DIR / "KB" / "ingest" / "underlying"
DEFAULT_INPUT = INGEST_DIR / "underlying_source_bundle.json"
OUTPUT_BUSINESS = PROJECT_DIR / "KB" / "underlying_business_profile.json"
OUTPUT_FUNDAMENTALS = PROJECT_DIR / "KB" / "underlying_fundamentals.json"
OUTPUT_EARNINGS = PROJECT_DIR / "KB" / "underlying_earnings.json"
OUTPUT_NEWS = PROJECT_DIR / "KB" / "underlying_news.json"
OUTPUT_PRICE_HISTORY = PROJECT_DIR / "KB" / "underlying_price_history.json"
OUTPUT_SHORT_PRICE_HISTORY = PROJECT_DIR / "KB" / "underlying_price_history_short.json"


def clean(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def compact(payload):
    if isinstance(payload, dict):
        return {
            key: compact(value)
            for key, value in payload.items()
            if value not in (None, "", [], {})
        }
    if isinstance(payload, list):
        return [compact(value) for value in payload if value not in (None, "", [], {})]
    return payload


def write_json(path: Path, payload):
    path.write_text(f"{json.dumps(payload, ensure_ascii=False, indent=2)}\n", encoding="utf-8")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def max_price_row_count(price_history: dict):
    if not isinstance(price_history, dict):
        return 0
    max_count = 0
    for payload in price_history.values():
        prices = payload.get("prices") if isinstance(payload, dict) else None
        if isinstance(prices, list):
            max_count = max(max_count, len(prices))
    return max_count


def should_preserve_existing_price_history(existing_history: dict, new_history: dict):
    existing_max = max_price_row_count(existing_history)
    new_max = max_price_row_count(new_history)
    if existing_max == 0 or new_max == 0:
        return False

    # KB/underlying_price_history.json is the chart source and should preserve
    # 3-year history. Short-history enrichment bundles must not overwrite it
    # unless the caller explicitly opts in.
    return existing_max >= 250 and new_max <= 90 and existing_max >= new_max * 3


def normalize_symbol(value):
    text = clean(value)
    if not text:
        return None
    return text.upper().replace("SET:", "")


def as_list(value):
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return value
    return [value]


def normalize_relevance_status(value):
    text = clean(value)
    if not text:
        return None
    lowered = text.lower()
    if lowered == "broad":
        return "context"
    return lowered


def has_meaningful_data(payload, ignored_keys):
    if not isinstance(payload, dict):
        return False
    for key, value in payload.items():
        if key in ignored_keys:
            continue
        if value not in (None, "", [], {}):
            return True
    return False


def normalize_business_profile(symbol: str, payload: dict):
    return compact({
        "underlying_symbol": symbol,
        "company_name": clean(payload.get("company_name")),
        "asset_type": clean(payload.get("asset_type")),
        "sector": clean(payload.get("sector")),
        "industry": clean(payload.get("industry")),
        "sub_industry": clean(payload.get("sub_industry")),
        "country": clean(payload.get("country")),
        "currency": clean(payload.get("currency")),
        "exchange": clean(payload.get("exchange")),
        "listing_symbol": clean(payload.get("listing_symbol")),
        "logo_url": clean(payload.get("logo_url")),
        "ipo_date": clean(payload.get("ipo_date")),
        "market_cap": clean(payload.get("market_cap")),
        "shares_outstanding": clean(payload.get("shares_outstanding")),
        "themes": as_list(payload.get("themes")),
        "business_summary": clean(payload.get("business_summary")),
        "business_model": clean(payload.get("business_model")),
        "products_services": as_list(payload.get("products_services")),
        "geographic_exposure": as_list(payload.get("geographic_exposure")),
        "key_drivers": as_list(payload.get("key_drivers")),
        "key_risks": as_list(payload.get("key_risks")),
        "competitors": as_list(payload.get("competitors")),
        "official_website": clean(payload.get("official_website")),
        "source": clean(payload.get("source")),
        "source_type": clean(payload.get("source_type")),
        "source_url": clean(payload.get("source_url")),
        "as_of_date": clean(payload.get("as_of_date")),
        "updated_at": clean(payload.get("updated_at")),
    })


def normalize_fundamentals(symbol: str, payload: dict):
    return compact({
        "underlying_symbol": symbol,
        "company_name": clean(payload.get("company_name")),
        "latest_fiscal_period": clean(payload.get("latest_fiscal_period")),
        "fiscal_year_end": clean(payload.get("fiscal_year_end")),
        "market_cap": clean(payload.get("market_cap")),
        "enterprise_value": clean(payload.get("enterprise_value")),
        "shares_outstanding": clean(payload.get("shares_outstanding")),
        "float_shares": clean(payload.get("float_shares")),
        "revenue": clean(payload.get("revenue")),
        "net_income": clean(payload.get("net_income")),
        "ebitda": clean(payload.get("ebitda")),
        "eps": clean(payload.get("eps")),
        "book_value_per_share": clean(payload.get("book_value_per_share")),
        "free_cash_flow": clean(payload.get("free_cash_flow")),
        "cash_and_equivalents": clean(payload.get("cash_and_equivalents")),
        "total_debt": clean(payload.get("total_debt")),
        "debt_to_equity": clean(payload.get("debt_to_equity")),
        "gross_margin": clean(payload.get("gross_margin")),
        "operating_margin": clean(payload.get("operating_margin")),
        "net_margin": clean(payload.get("net_margin")),
        "roe": clean(payload.get("roe")),
        "roa": clean(payload.get("roa")),
        "pe_ratio": clean(payload.get("pe_ratio")),
        "forward_pe_ratio": clean(payload.get("forward_pe_ratio")),
        "pb_ratio": clean(payload.get("pb_ratio")),
        "ps_ratio": clean(payload.get("ps_ratio")),
        "ev_to_ebitda": clean(payload.get("ev_to_ebitda")),
        "dividend_yield": clean(payload.get("dividend_yield")),
        "revenue_growth_yoy": clean(payload.get("revenue_growth_yoy")),
        "net_income_growth_yoy": clean(payload.get("net_income_growth_yoy")),
        "eps_growth_yoy": clean(payload.get("eps_growth_yoy")),
        "beta": clean(payload.get("beta")),
        "week_52_high": clean(payload.get("week_52_high")),
        "week_52_low": clean(payload.get("week_52_low")),
        "week_52_high_date": clean(payload.get("week_52_high_date")),
        "week_52_low_date": clean(payload.get("week_52_low_date")),
        "analyst_target_price": clean(payload.get("analyst_target_price")),
        "analyst_rating": clean(payload.get("analyst_rating")),
        "revenue_summary": clean(payload.get("revenue_summary")),
        "profit_summary": clean(payload.get("profit_summary")),
        "profitability_summary": clean(payload.get("profitability_summary")),
        "balance_sheet_summary": clean(payload.get("balance_sheet_summary")),
        "valuation_summary": clean(payload.get("valuation_summary")),
        "data_status": clean(payload.get("data_status")),
        "source": clean(payload.get("source")),
        "source_type": clean(payload.get("source_type")),
        "source_url": clean(payload.get("source_url")),
        "source_priority": clean(payload.get("source_priority")),
        "as_of_date": clean(payload.get("as_of_date")),
        "updated_at": clean(payload.get("updated_at")),
    })


def normalize_earnings_records(symbol: str, records):
    normalized = []
    for record in records or []:
        if not isinstance(record, dict):
            continue
        normalized.append(compact({
            "underlying_symbol": symbol,
            "fiscal_period": clean(record.get("fiscal_period")),
            "fiscal_year": clean(record.get("fiscal_year")),
            "fiscal_quarter": clean(record.get("fiscal_quarter")),
            "earnings_date": clean(record.get("earnings_date") or record.get("date")),
            "earnings_time": clean(record.get("earnings_time") or record.get("time")),
            "eps_estimate": clean(record.get("eps_estimate")),
            "eps_actual": clean(record.get("eps_actual")),
            "eps_surprise_pct": clean(record.get("eps_surprise_pct")),
            "revenue_estimate": clean(record.get("revenue_estimate")),
            "revenue_actual": clean(record.get("revenue_actual")),
            "revenue_surprise_pct": clean(record.get("revenue_surprise_pct")),
            "consensus_summary": clean(record.get("consensus_summary")),
            "result_summary": clean(record.get("result_summary") or record.get("summary")),
            "source": clean(record.get("source")),
            "source_type": clean(record.get("source_type")),
            "source_url": clean(record.get("source_url") or record.get("url")),
            "as_of_date": clean(record.get("as_of_date")),
            "updated_at": clean(record.get("updated_at")),
        }))
    return normalized


def normalize_news_records(symbol: str, records):
    normalized = []
    for record in records or []:
        if not isinstance(record, dict):
            continue
        normalized.append(compact({
            "underlying_symbol": symbol,
            "published_at": clean(record.get("published_at") or record.get("date")),
            "title": clean(record.get("title")),
            "summary": clean(record.get("summary")),
            "publisher": clean(record.get("publisher")),
            "category": clean(record.get("category")),
            "source": clean(record.get("source")),
            "source_type": clean(record.get("source_type")),
            "source_url": clean(record.get("source_url") or record.get("url")),
            "related_topics": as_list(record.get("related_topics") or record.get("tags")),
            "tags": as_list(record.get("tags")),
            "sentiment": clean(record.get("sentiment")),
            "sentiment_score": clean(record.get("sentiment_score")),
            "is_direct_company_news": record.get("is_direct_company_news"),
            "importance": clean(record.get("importance")),
            "relevance_score": clean(record.get("relevance_score")),
            "relevance_status": normalize_relevance_status(record.get("relevance_status")),
            "matched_terms": as_list(record.get("matched_terms")),
            "as_of_date": clean(record.get("as_of_date")),
            "updated_at": clean(record.get("updated_at")),
        }))
    return sorted(
        normalized,
        key=lambda row: (
            float(row.get("relevance_score") or 0),
            clean(row.get("published_at")) or "",
        ),
        reverse=True,
    )


def normalize_price_history(symbol: str, payload: dict):
    prices = []
    for row in (payload or {}).get("prices") or []:
        if not isinstance(row, dict):
            continue
        prices.append(compact({
            "date": clean(row.get("date")),
            "open": clean(row.get("open")),
            "high": clean(row.get("high")),
            "low": clean(row.get("low")),
            "close": clean(row.get("close")),
            "adjusted_close": clean(row.get("adjusted_close")),
            "volume": clean(row.get("volume")),
        }))
    normalized = compact({
        "underlying_symbol": symbol,
        "interval": clean(payload.get("interval")),
        "currency": clean(payload.get("currency")),
        "exchange": clean(payload.get("exchange")),
        "mic_code": clean(payload.get("mic_code")),
        "security_type": clean(payload.get("security_type")),
        "source": clean(payload.get("source")),
        "source_type": clean(payload.get("source_type")),
        "source_url": clean(payload.get("source_url")),
        "source_priority": clean(payload.get("source_priority")),
        "as_of_date": clean(payload.get("as_of_date")),
        "updated_at": clean(payload.get("updated_at")),
        "prices": prices,
    })
    return normalized if prices else {}


def build_outputs(bundle: dict):
    business = {}
    fundamentals = {}
    earnings = {}
    news = {}
    price_history = {}

    for raw_symbol, sections in bundle.items():
        symbol = normalize_symbol(raw_symbol)
        if not symbol or not isinstance(sections, dict):
            continue

        profile = normalize_business_profile(symbol, sections.get("business_profile") or {})
        if has_meaningful_data(profile, {"underlying_symbol"}):
            business[symbol] = profile

        fundamental_profile = normalize_fundamentals(symbol, sections.get("fundamentals") or {})
        if has_meaningful_data(fundamental_profile, {"underlying_symbol"}):
            fundamentals[symbol] = fundamental_profile

        earning_rows = normalize_earnings_records(symbol, sections.get("earnings") or [])
        if earning_rows:
            earnings[symbol] = earning_rows

        news_rows = normalize_news_records(symbol, sections.get("news") or [])
        if news_rows:
            news[symbol] = news_rows

        price_history_payload = normalize_price_history(symbol, sections.get("price_history") or {})
        if price_history_payload:
            price_history[symbol] = price_history_payload

    return {
        "business": business,
        "fundamentals": fundamentals,
        "earnings": earnings,
        "news": news,
        "price_history": price_history,
    }


def main():
    args = sys.argv[1:]
    overwrite_price_history = False
    if "--overwrite-price-history" in args:
        overwrite_price_history = True
        args = [arg for arg in args if arg != "--overwrite-price-history"]

    input_path = Path(args[0]) if args else DEFAULT_INPUT
    if not input_path.exists():
        raise FileNotFoundError(f"underlying source bundle not found: {input_path}")

    bundle = load_json(input_path)
    if not isinstance(bundle, dict):
        raise ValueError("underlying source bundle must be a top-level object keyed by underlying symbol")

    outputs = build_outputs(bundle)
    write_json(OUTPUT_BUSINESS, outputs["business"])
    write_json(OUTPUT_FUNDAMENTALS, outputs["fundamentals"])
    write_json(OUTPUT_EARNINGS, outputs["earnings"])
    write_json(OUTPUT_NEWS, outputs["news"])

    # The daily enrichment bundle only carries short-window price history and
    # should not replace the main chart source by default. The main file is
    # reserved for curated/normalized long-history data plus explicit snapshot
    # merges from the daily runner.
    price_history_output = OUTPUT_SHORT_PRICE_HISTORY
    price_history_guard = "written_short_history_default"
    existing_price_history = load_json(OUTPUT_PRICE_HISTORY) if OUTPUT_PRICE_HISTORY.exists() else {}
    if overwrite_price_history:
        price_history_output = OUTPUT_PRICE_HISTORY
        price_history_guard = "explicit_overwrite_main_price_history"
    elif not OUTPUT_PRICE_HISTORY.exists():
        price_history_output = OUTPUT_PRICE_HISTORY
        price_history_guard = "written_main_price_history_missing"
    elif should_preserve_existing_price_history(existing_price_history, outputs["price_history"]):
        price_history_guard = "preserved_existing_main_written_short_history"

    write_json(price_history_output, outputs["price_history"])

    report = {
        "input": str(input_path),
        "outputs": {
            "underlying_business_profile": str(OUTPUT_BUSINESS),
            "underlying_fundamentals": str(OUTPUT_FUNDAMENTALS),
            "underlying_earnings": str(OUTPUT_EARNINGS),
            "underlying_news": str(OUTPUT_NEWS),
            "underlying_price_history": str(price_history_output),
        },
        "price_history_guard": {
            "status": price_history_guard,
            "main_output": str(OUTPUT_PRICE_HISTORY),
            "short_history_output": str(OUTPUT_SHORT_PRICE_HISTORY),
            "existing_main_max_rows": max_price_row_count(existing_price_history),
            "new_bundle_max_rows": max_price_row_count(outputs["price_history"]),
            "overwrite_price_history": overwrite_price_history,
        },
        "counts": {
            "underlying_business_profile_keys": len(outputs["business"]),
            "underlying_fundamentals_keys": len(outputs["fundamentals"]),
            "underlying_earnings_keys": len(outputs["earnings"]),
            "underlying_news_keys": len(outputs["news"]),
            "underlying_price_history_keys": len(outputs["price_history"]),
        },
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
