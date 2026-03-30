"""
tfex_eod_downloader.py
======================
ดึงข้อมูล EOD Option (Settlement Price + OI + Volume) จาก TFEX
ทุกเช้า 07:30 ก่อนตลาดเปิด

API ที่ใช้:
  GET https://www.tfex.co.th/api/set/tfex/instrument/TXI_O_SET50/options-info-list
      ?tradeDateType=P&contractMonth=&tradeDate=YYYY-MM-DD

Response structure:
  {
    "tradingDate": "2026-03-30T00:00:00+07:00",
    "contractMonths": [
      {
        "contractMonth": "04/2026",
        "callPutList": [
          {
            "strikePrice": "970",
            "isAtTheMoney": true,
            "call": { "symbol": "S50J26C970", "last": X, "volume": X, "oi": X,
                      "settlementPrice": X, "priorSettlementPrice": X },
            "put":  { ... }
          }
        ]
      }
    ]
  }

Output:
  Option EOD/{DATE}/{DATE}_options_eod.csv     ← format เดิม (compatible กับ pipeline)
  Option EOD/{DATE}/{DATE}_options_eod.parquet ← fast version
  Option EOD/latest.parquet                    ← always latest date

Usage:
  python scripts/options_regime/tfex_eod_downloader.py             # วันนี้
  python scripts/options_regime/tfex_eod_downloader.py --date 2026-03-27  # historical
  python scripts/options_regime/tfex_eod_downloader.py --backfill 30       # ย้อนหลัง 30 วัน
  python scripts/options_regime/tfex_eod_downloader.py --schedule          # รัน daemon 07:30 ทุกวัน
"""

import os, sys, time, json, re, argparse, logging
from datetime import datetime, timedelta, date
import pandas as pd
import numpy as np

# ─── optional deps (graceful fallback) ───────────────────────────────────────
try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import schedule
    HAS_SCHEDULE = True
except ImportError:
    HAS_SCHEDULE = False

# ─── CONFIG ──────────────────────────────────────────────────────────────────
BASE_URL   = "https://www.tfex.co.th"
API_PATH   = "/api/set/tfex/instrument/TXI_O_SET50/options-info-list"
# NOTE: tradeDateType=P overrides tradeDate → always returns last settlement
# To get date-specific data, omit tradeDateType and use only tradeDate=YYYY-MM-DD
MARKET_URL = ("https://www.tfex.co.th/th/market-data/daily-market-quotation"
              "/trading-quotation-by-series")
OUTPUT_DIR = "Option EOD"

HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/123.0.0.0 Safari/537.36",
    "Accept":          "application/json, text/plain, */*",
    "Accept-Language": "th-TH,th;q=0.9,en;q=0.8",
    "Referer":         MARKET_URL,
    "Origin":          BASE_URL,
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("tfex_eod")

# ─── COOKIE STORE (auto-updated by Playwright) ───────────────────────────────
COOKIE_FILE = os.path.join(os.path.dirname(__file__), ".tfex_cookies.json")

# ─────────────────────────────────────────────────────────────────────────────
# 1.  PLAYWRIGHT — visit page, harvest cookies, fetch via JS
# ─────────────────────────────────────────────────────────────────────────────
def fetch_via_playwright(trade_date: str) -> dict | None:
    """
    Launch headless Chromium, visit TFEX market page to get Imperva cookies,
    then call the API via page.evaluate() so cookies are sent automatically.
    """
    if not HAS_PLAYWRIGHT:
        log.warning("playwright not installed.  pip install playwright && playwright install chromium")
        return None

    log.info("Playwright: launching headless browser …")
    # IMPORTANT: omit tradeDateType so server uses the actual tradeDate
    url = f"{BASE_URL}{API_PATH}?tradeDate={trade_date}"

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context(
                user_agent=HEADERS["User-Agent"],
                locale="th-TH",
                timezone_id="Asia/Bangkok",
            )
            page = ctx.new_page()

            # Step 1: visit main page → Imperva sets cookies
            log.info("  Visiting market page to obtain session cookies …")
            page.goto(MARKET_URL, wait_until="networkidle", timeout=30_000)
            time.sleep(2)

            # Step 2: call API from within page context (cookies auto-sent)
            log.info(f"  Fetching options-info-list for {trade_date} …")
            result = page.evaluate(f"""
                async () => {{
                    const r = await fetch('{url}', {{
                        method: 'GET',
                        headers: {{
                            'Accept': 'application/json',
                            'Referer': '{MARKET_URL}',
                        }}
                    }});
                    if (!r.ok) return null;
                    return r.json();
                }}
            """)

            # Step 3: save cookies for requests fallback
            cookies = ctx.cookies()
            with open(COOKIE_FILE, "w") as f:
                json.dump(cookies, f)
            log.info(f"  Cookies saved → {COOKIE_FILE}")

            browser.close()

        if result:
            log.info(f"  ✅ Playwright: got {len(result.get('contractMonths', []))} contract months")
        return result

    except Exception as e:
        log.error(f"  Playwright error: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 2.  REQUESTS + SAVED COOKIES
# ─────────────────────────────────────────────────────────────────────────────
def fetch_via_requests(trade_date: str) -> dict | None:
    """
    Use saved cookies from COOKIE_FILE + requests library.
    Faster than playwright on subsequent runs.
    """
    if not HAS_REQUESTS:
        log.warning("requests not installed.  pip install requests")
        return None

    if not os.path.exists(COOKIE_FILE):
        log.warning(f"Cookie file not found: {COOKIE_FILE}  (run with --playwright first)")
        return None

    # Load cookies
    with open(COOKIE_FILE) as f:
        cookies_list = json.load(f)

    session = requests.Session()
    session.headers.update(HEADERS)
    for ck in cookies_list:
        session.cookies.set(ck["name"], ck["value"], domain=ck.get("domain", ".tfex.co.th"))

    # IMPORTANT: omit tradeDateType so server uses the actual tradeDate
    url = f"{BASE_URL}{API_PATH}?tradeDate={trade_date}"

    log.info(f"  requests: GET {url}")
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        log.info(f"  ✅ requests: got {len(data.get('contractMonths', []))} contract months")
        return data
    except Exception as e:
        log.warning(f"  requests failed: {e}  (cookies may have expired)")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# 3.  PARSE JSON → FLAT DataFrame
# ─────────────────────────────────────────────────────────────────────────────
def parse_response(data: dict, trade_date: str) -> pd.DataFrame:
    """
    Convert nested JSON to flat rows compatible with existing Option EOD CSV format:
      date | series | type | strike | expiry | underlying_price | settlement_price | volume | oi
    """
    rows = []
    trading_date = pd.Timestamp(trade_date)
    contract_months = data.get("contractMonths", [])

    for cm in contract_months:
        cm_str = cm.get("contractMonth", "")          # e.g. "04/2026"
        # parse expiry → first business day of month
        try:
            month, year = cm_str.split("/")
            expiry = pd.Timestamp(f"{year}-{month}-01")
        except Exception:
            expiry = pd.NaT

        for cp in cm.get("callPutList", []):
            strike = float(cp.get("strikePrice", 0))

            for side, opt_type in [("call", "C"), ("put", "P")]:
                opt = cp.get(side, {})
                if not opt:
                    continue

                symbol = opt.get("symbol", "")
                # parse series name from symbol: S50J26C900 → S50J26
                series_match = re.match(r"(S50\w{3})[CP]", symbol)
                series = series_match.group(1) if series_match else symbol[:6]

                rows.append({
                    "date":              trade_date,
                    "series":            symbol,           # full symbol with strike
                    "series_base":       series,           # e.g. S50J26
                    "type":              opt_type,         # C or P
                    "strike":            int(strike),
                    "expiry":            expiry.strftime("%Y-%m-%d") if not pd.isna(expiry) else "",
                    "contract_month":    cm_str,
                    "settlement_price":  opt.get("settlementPrice",      np.nan),
                    "prior_settlement":  opt.get("priorSettlementPrice",  np.nan),
                    "last":              opt.get("last",                   np.nan),
                    "volume":            int(opt.get("volume", 0) or 0),
                    "oi":                int(opt.get("oi",     0) or 0),
                    "is_atm":            cp.get("isAtTheMoney", False),
                    "underlying_price":  data.get("underlyingPrice", np.nan),
                })

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["contract_month", "strike", "type"]).reset_index(drop=True)
    log.info(f"  Parsed {len(df)} rows  |  {df['series_base'].nunique()} series  |  "
             f"strikes {df['strike'].min()}–{df['strike'].max()}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 4.  SAVE — CSV (compatible) + Parquet
# ─────────────────────────────────────────────────────────────────────────────
def save_eod(df: pd.DataFrame, trade_date: str):
    """Save in multiple formats for backward compatibility."""
    if df.empty:
        log.warning("  Empty DataFrame — nothing to save")
        return

    date_dir = os.path.join(OUTPUT_DIR, trade_date)
    os.makedirs(date_dir, exist_ok=True)

    # ── Parquet (full detail) ──
    parquet_path = os.path.join(date_dir, f"{trade_date}_options_eod.parquet")
    df.to_parquet(parquet_path, index=False)
    log.info(f"  ✅ Parquet → {parquet_path}")

    # ── CSV (compatible with existing Option EOD/*.csv format) ──
    csv_cols = ["date", "series", "type", "strike", "expiry",
                "underlying_price", "settlement_price", "volume", "oi"]
    csv_df = df[csv_cols].copy()
    csv_df["date"] = csv_df["date"].dt.strftime("%Y-%m-%d")

    # per-symbol CSV (same as existing format)
    for symbol, grp in csv_df.groupby("series"):
        sym_csv = os.path.join(OUTPUT_DIR, f"{symbol}.csv")
        if os.path.exists(sym_csv):
            existing = pd.read_csv(sym_csv)
            # avoid duplicate dates
            existing = existing[existing["date"] != trade_date]
            combined = pd.concat([existing, grp], ignore_index=True)
            combined = combined.sort_values("date")
            combined.to_csv(sym_csv, index=False)
        else:
            grp.to_csv(sym_csv, index=False)

    log.info(f"  ✅ CSV updated for {df['series'].nunique()} symbols")

    # ── Latest snapshot ──
    latest_path = os.path.join(OUTPUT_DIR, "latest.parquet")
    df.to_parquet(latest_path, index=False)
    log.info(f"  ✅ latest.parquet updated")

    # ── Summary print ──
    print(f"\n{'─'*60}")
    print(f"  TFEX EOD Data  |  {trade_date}")
    print(f"{'─'*60}")
    print(f"  Series:   {sorted(df['series_base'].unique())}")
    print(f"  Strikes:  {df['strike'].min()} → {df['strike'].max()}")
    print(f"  Rows:     {len(df)} ({len(df[df['type']=='C'])} C + {len(df[df['type']=='P'])} P)")
    print(f"  Total OI: {df['oi'].sum():,.0f}  |  Volume: {df['volume'].sum():,.0f}")
    if 'is_atm' in df.columns:
        atm = df[df['is_atm']]
        if not atm.empty:
            print(f"  ATM strike: {atm['strike'].iloc[0]}")
            c = atm[atm['type']=='C']
            p = atm[atm['type']=='P']
            if not c.empty:
                print(f"    ATM Call IV~settlement: {c['settlement_price'].iloc[0]:.2f}")
            if not p.empty:
                print(f"    ATM Put  IV~settlement: {p['settlement_price'].iloc[0]:.2f}")
    print(f"{'─'*60}\n")


# ─────────────────────────────────────────────────────────────────────────────
# 5.  MAIN DOWNLOAD FUNCTION
# ─────────────────────────────────────────────────────────────────────────────
def download_eod(trade_date: str, force_playwright: bool = False) -> pd.DataFrame:
    """
    Download EOD for a single date. Tries:
      1. requests + saved cookies
      2. playwright (if requests fails or force_playwright=True)
    """
    log.info(f"━━ Downloading TFEX EOD: {trade_date} ━━")

    data = None

    if not force_playwright:
        # Try fast path first
        data = fetch_via_requests(trade_date)

    if data is None:
        # Fall back to playwright
        data = fetch_via_playwright(trade_date)

    if data is None:
        log.error(f"  ❌ Failed to fetch data for {trade_date}")
        return pd.DataFrame()

    df = parse_response(data, trade_date)
    if not df.empty:
        save_eod(df, trade_date)

    return df


# ─────────────────────────────────────────────────────────────────────────────
# 6.  BACKFILL MODE — ดึงย้อนหลัง N วัน
# ─────────────────────────────────────────────────────────────────────────────
def backfill(days: int, skip_existing: bool = True):
    """ดึงข้อมูลย้อนหลัง N วันทำการ"""
    today = date.today()
    bdays = pd.bdate_range(end=today, periods=days + 10)  # buffer for weekends
    bdays = [d for d in bdays if d.date() <= today][-days:]

    log.info(f"Backfill: {len(bdays)} business days  ({bdays[0].date()} → {bdays[-1].date()})")

    results = []
    for bd in bdays:
        date_str = bd.strftime("%Y-%m-%d")

        # skip ถ้ามีอยู่แล้ว
        if skip_existing:
            latest = os.path.join(OUTPUT_DIR, date_str, f"{date_str}_options_eod.parquet")
            if os.path.exists(latest):
                log.info(f"  ⏭  {date_str} already downloaded — skip")
                continue

        df = download_eod(date_str)
        if not df.empty:
            results.append(df)
        time.sleep(2)   # rate limit

    log.info(f"Backfill complete: {len(results)} days downloaded")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# 7.  SCHEDULER — รัน 07:30 ทุกวันทำการ
# ─────────────────────────────────────────────────────────────────────────────
def run_daily_job():
    """Job ที่รันตอน 07:30 — ดึง EOD ของวันก่อนหน้า"""
    today = date.today()
    # last business day
    if today.weekday() == 0:  # Monday
        last_bday = today - timedelta(days=3)   # Friday
    elif today.weekday() in (5, 6):
        return  # Weekend — skip
    else:
        last_bday = today - timedelta(days=1)

    trade_date = last_bday.strftime("%Y-%m-%d")
    log.info(f"═══ Daily EOD job: {trade_date} ═══")
    df = download_eod(trade_date)

    if not df.empty:
        # ── trigger downstream pipeline ──
        log.info("Triggering downstream: vrp, hurst update …")
        os.system(
            "cd /Users/ratchaphop/Developer/Quant-S && "
            "python scripts/options_regime/update_vrp_hurst.py "
            f"--date {trade_date} 2>&1 | tail -5"
        )


def start_scheduler(run_time: str = "07:30"):
    if not HAS_SCHEDULE:
        log.error("schedule not installed.  pip install schedule")
        sys.exit(1)

    log.info(f"Scheduler started — will run daily at {run_time} BKK time")
    schedule.every().monday.at(run_time).do(run_daily_job)
    schedule.every().tuesday.at(run_time).do(run_daily_job)
    schedule.every().wednesday.at(run_time).do(run_daily_job)
    schedule.every().thursday.at(run_time).do(run_daily_job)
    schedule.every().friday.at(run_time).do(run_daily_job)

    while True:
        schedule.run_pending()
        time.sleep(30)


# ─────────────────────────────────────────────────────────────────────────────
# 8.  VERIFY — ตรวจสอบข้อมูลที่ดาวน์โหลดมา
# ─────────────────────────────────────────────────────────────────────────────
def verify_eod(trade_date: str):
    """แสดง OI/Volume สรุปของวันที่ระบุ"""
    path = os.path.join(OUTPUT_DIR, trade_date, f"{trade_date}_options_eod.parquet")
    if not os.path.exists(path):
        print(f"❌ Not found: {path}")
        return

    df = pd.read_parquet(path)
    print(f"\n{'═'*65}")
    print(f"  TFEX EOD Verification: {trade_date}")
    print(f"{'═'*65}")
    print(f"  Rows: {len(df)}  |  Calls: {(df['type']=='C').sum()}  |  Puts: {(df['type']=='P').sum()}")
    print()

    # OI by series
    by_series = df.groupby("series_base").agg(
        total_oi=("oi", "sum"),
        total_vol=("volume", "sum"),
        n_strikes=("strike", "nunique"),
    ).sort_values("total_oi", ascending=False)
    print("  OI by Series:")
    print(by_series.to_string())
    print()

    # ATM snapshot
    atm = df[df.get("is_atm", pd.Series(False, index=df.index))]
    if not atm.empty:
        print("  ATM Snapshot:")
        print(atm[["series", "type", "strike", "settlement_price", "volume", "oi"]].to_string(index=False))
    print(f"{'═'*65}\n")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def get_last_bday() -> str:
    today = date.today()
    offset = 1 if today.weekday() not in (5, 6) else (today.weekday() - 4)
    last = today - timedelta(days=offset)
    while last.weekday() >= 5:
        last -= timedelta(days=1)
    return last.strftime("%Y-%m-%d")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TFEX EOD Option Downloader")
    parser.add_argument("--date",           type=str,  default=None,
                        help="Specific date YYYY-MM-DD (default: last business day)")
    parser.add_argument("--backfill",       type=int,  default=None,
                        help="Backfill N business days")
    parser.add_argument("--schedule",       action="store_true",
                        help="Run as daemon (daily 07:30)")
    parser.add_argument("--time",           type=str,  default="07:30",
                        help="Schedule time HH:MM (default 07:30)")
    parser.add_argument("--verify",         type=str,  default=None,
                        help="Verify downloaded data for date YYYY-MM-DD")
    parser.add_argument("--playwright",     action="store_true",
                        help="Force use Playwright (refresh cookies)")
    parser.add_argument("--skip-existing",  action="store_true", default=True,
                        help="Skip dates already downloaded (backfill mode)")

    args = parser.parse_args()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── Verify mode ──
    if args.verify:
        verify_eod(args.verify)

    # ── Schedule mode ──
    elif args.schedule:
        start_scheduler(args.time)

    # ── Backfill mode ──
    elif args.backfill:
        backfill(args.backfill, skip_existing=args.skip_existing)

    # ── Single date ──
    else:
        trade_date = args.date or get_last_bday()
        download_eod(trade_date, force_playwright=args.playwright)
