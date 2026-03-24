"""
collect_mt5_tick_dom.py
━━━━━━━━━━━━━━━━━━━━━━━
เก็บข้อมูล จาก MT5 Toptrader:

  [FUTURES]  S50IF_CON   → Tick + DOM
  [OPTIONS]  S50 ทุกซีรี่ → Tick + DOM  (tick options ย้อนหลังซื้อไม่ได้)
  [STOCKS]   SET50 ทุกตัว → DOM เท่านั้น (tick หุ้นซื้อย้อนหลังได้)

รัน: python collect_mt5_tick_dom.py

Output (Parquet รายวัน):
  data/ticks/S50IF_CON/2025-03-21.parquet
  data/ticks/S50J25C900/2025-03-21.parquet
  data/dom/S50IF_CON/2025-03-21.parquet
  data/dom/ADVANC/2025-03-21.parquet
  ...
"""
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pandas as pd

try:
    import MetaTrader5 as mt5
except ImportError:
    raise SystemExit("pip install MetaTrader5 pandas pyarrow")

# ── Config ─────────────────────────────────────────────────────────
DOM_INTERVAL_FUTURES = 0.1   # Futures+Options: 100ms (near every-event)
DOM_INTERVAL_HIGH    = 0.1   # HIGH-vol stocks (DELTA, KBANK...): 100ms
DOM_INTERVAL_MED     = 0.5   # MEDIUM-vol stocks: 500ms
DOM_INTERVAL_LOW     = 1.0   # LOW-vol stocks: 1s
TICK_FLUSH_MIN       = 5     # flush Parquet ทุก 5 นาที
SYMBOL_REFRESH_MIN   = 30    # re-discover options/stocks ทุก 30 นาที
OUT_DIR              = Path("C:/quant-s/data")   # absolute path — safe for Task Scheduler
LOG_FILE             = Path("C:/quant-s/collector.log")
LOG_LEVEL            = logging.INFO

# ── Tick activity tiers (จาก 01_Raw_Ticks file size analysis) ──────
# รัน /tmp/analyze_tick_frequency.py เพื่ออัปเดต list หลังเก็บข้อมูล 6 เดือน
# HIGH: avg > 2MB/month → 100ms DOM
HIGH_DOM_STOCKS = {
    "DELTA", "AOT",    "KBANK", "SCB",    "BBL",   "BAY",
    "KTB",   "ADVANC", "CPALL", "PTT",    "PTTEP", "MINT",
    "BDMS",  "CPN",    "TRUE",  "TTB",    "GULF",  "IVL",
    "HMPRO", "BTS",    "SCC",   "INTUCH", "OR",
}
# MEDIUM: avg 0.5-2MB/month → 500ms DOM
MED_DOM_STOCKS = {
    "BANPU", "AWC",   "M",      "MTC",   "KKP",  "BJC",
    "TCAP",  "KCE",   "TISCO",  "EA",    "CBG",  "SAWAD",
    "BEM",   "RATCH", "EGCO",   "PTTGC", "JMT",  "WHA",
    "THCOM", "SCGP",  "OSP",    "CK",    "GPSC", "CENTEL",
}
# LOW: < 0.5MB/month → 1s DOM (default ถ้าไม่อยู่ใน HIGH/MED)


def get_dom_interval(sym: str, is_fo: bool = False) -> float:
    """Return DOM snapshot interval in seconds."""
    if is_fo:
        return DOM_INTERVAL_FUTURES
    if sym in HIGH_DOM_STOCKS:
        return DOM_INTERVAL_HIGH
    if sym in MED_DOM_STOCKS:
        return DOM_INTERVAL_MED
    return DOM_INTERVAL_LOW

# 127 หุ้นที่ Block Trade ได้ (Long/Short) — DOM only
STOCK_SYMBOLS = [
    "AAV",    "ADVANC", "AEONTS", "AMATA",  "AOT",    "AP",
    "AWC",    "BA",     "BAM",    "BANPU",  "BAY",    "BBL",
    "BCH",    "BCP",    "BCPG",   "BDMS",   "BEC",    "BEM",
    "BGRIM",  "BH",     "BJC",    "BLA",    "BLAND",  "BPP",
    "BSRC",   "BTS",    "CBG",    "CENTEL", "CHG",    "CK",
    "CKP",    "COM7",   "CPALL",  "CPF",    "CPN",    "CRC",
    "DELTA",  "EA",     "EASTW",  "EGCO",   "EPG",    "ERW",
    "GFPT",   "GLOBAL", "GPSC",   "GULF",   "GUNKUL", "HANA",
    "HMPRO",  "ICHI",   "INTUCH", "IRPC",   "ITD",    "IVL",
    "JAS",    "JMT",    "KBANK",  "KCE",    "KEX",    "KKP",
    "KTB",    "KTC",    "LH",     "LPN",    "M",      "MAJOR",
    "MBK",    "MEGA",   "MINT",   "MTC",    "OR",     "ORI",
    "OSP",    "PLANB",  "PRM",    "PSH",    "PSL",    "PTG",
    "PTT",    "PTTEP",  "PTTGC",  "QH",     "RATCH",  "RS",
    "S",      "SAMART", "SAWAD",  "SCB",    "SCC",    "SCGP",
    "SGP",    "SIRI",   "SPALI",  "SPCG",   "SPRC",   "STA",
    "STEC",   "STGT",   "STPI",   "SUPER",  "TASCO",  "TCAP",
    "THAI",   "THANI",  "THCOM",  "THG",    "TISCO",  "TKN",
    "TOA",    "TOP",    "TPIPL",  "TPIPP",  "TQM",    "TRUE",
    "TTA",    "TTB",    "TTCL",   "TTW",    "TU",     "TVO",
    "UNIQ",   "VGI",    "VNG",    "WHA",    "WHAUP",
]

# ── Logging ────────────────────────────────────────────────────────
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(),                                      # console
        logging.FileHandler(str(LOG_FILE), encoding="utf-8"),         # file
    ],
)
log = logging.getLogger(__name__)


# ── MT5 helpers ────────────────────────────────────────────────────
def init_mt5(max_wait_min: int = 30):
    """Retry MT5 initialize จนกว่าจะ login เสร็จ (รอสูงสุด max_wait_min นาที)
    ทำให้ script เริ่มรันได้ทันทีหลัง boot โดยไม่ต้องรอ OTP ก่อน
    """
    deadline = datetime.utcnow() + timedelta(minutes=max_wait_min)
    attempt = 0
    while datetime.utcnow() < deadline:
        if mt5.initialize():
            info = mt5.terminal_info()
            log.info(f"MT5 connected: {info.name} build={info.build}")
            return
        attempt += 1
        log.warning(f"MT5 not ready [{attempt}] (รอ OTP หรือ MT5 ยังไม่เปิด?) — retry in 10s...")
        time.sleep(10)
    raise RuntimeError(f"MT5 init timeout หลัง {max_wait_min} นาที — {mt5.last_error()}")


def discover_futures_options() -> list:
    """Auto-discover S50IF + S50 Options (ทุก Call/Put ทุก strike)"""
    symbols = ["S50IF_CON"]
    all_syms = mt5.symbols_get(group="*S50*") or []
    for s in all_syms:
        name = s.name
        if (name.startswith("S50")
                and len(name) >= 8
                and any(m in name[3:6] for m in "HJKMNQUVXZ")
                and ("C" in name[5:] or "P" in name[5:])):
            symbols.append(name)
    symbols = sorted(set(symbols))
    log.info(f"Futures/Options: {len(symbols)} symbols ({len(symbols)-1} options)")
    return symbols


def discover_stock_symbols() -> list:
    """ตรวจสอบว่า SET50 stocks ตัวไหนมีใน MT5"""
    available = []
    for s in STOCK_SYMBOLS:
        info = mt5.symbol_info(s)
        if info is not None:
            available.append(s)
    log.info(f"Stocks (DOM only): {len(available)}/{len(STOCK_SYMBOLS)} available in MT5")
    return available


def subscribe_dom(symbols: list):
    for sym in symbols:
        ok = mt5.market_book_add(sym)
        log.debug(f"DOM subscribe {sym}: {'OK' if ok else 'FAIL'}")


def unsubscribe_dom(symbols: list):
    for sym in symbols:
        mt5.market_book_release(sym)


# ── Data collectors ────────────────────────────────────────────────
def collect_ticks(sym: str, from_dt: datetime) -> pd.DataFrame:
    """Pull new ticks since from_dt."""
    ticks = mt5.copy_ticks_from(sym, from_dt, 100_000, mt5.COPY_TICKS_ALL)
    if ticks is None or len(ticks) == 0:
        return pd.DataFrame()
    df = pd.DataFrame(ticks)
    df["time"]     = pd.to_datetime(df["time"],     unit="s")
    df["time_msc"] = pd.to_datetime(df["time_msc"], unit="ms")
    return df


def snapshot_dom(sym: str) -> pd.DataFrame:
    """Snapshot order book — 1 snapshot = หลาย rows (bid/ask levels)"""
    book = mt5.market_book_get(sym)
    if book is None:
        return pd.DataFrame()
    ts   = datetime.utcnow()
    rows = [{
        "timestamp":  ts,
        "symbol":     sym,
        "type":       "bid" if item.type == mt5.BOOK_TYPE_BUY else "ask",
        "price":      item.price,
        "volume":     item.volume,
        "volume_dbl": item.volume_dbl,
    } for item in book]
    return pd.DataFrame(rows)


def _dom_hash(sym: str):
    """Hash ของ order book ณ ขณะนั้น — ใช้ detect DOM change สำหรับ FO."""
    book = mt5.market_book_get(sym)
    if book is None:
        return None
    return hash(tuple((item.price, item.volume) for item in book))


def _poll_stock_dom(args: tuple):
    """Poll DOM หุ้น 1 ตัว (รัน parallel ใน ThreadPool).
    Returns (sym, DataFrame | None)
    """
    sym, snap_now, last_ts = args
    if (snap_now - last_ts).total_seconds() < get_dom_interval(sym):
        return sym, None
    df = snapshot_dom(sym)
    return sym, df if not df.empty else None


# ── Save ───────────────────────────────────────────────────────────
def save_parquet(df: pd.DataFrame, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        df = pd.concat([pd.read_parquet(path), df], ignore_index=True)
    df.drop_duplicates().to_parquet(path, index=False, compression="snappy")


def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


# ── Market session ─────────────────────────────────────────────────
def _bkk_hhmm() -> tuple[bool, int]:
    """(is_weekday, hhmm) in BKK time"""
    now = datetime.utcnow() + timedelta(hours=7)
    return now.weekday() < 5, now.hour * 100 + now.minute


def is_fo_open() -> bool:
    """S50IF_CON + Options trading sessions (BKK):
      Morning:   09:45 - 12:30
      Afternoon: 13:45 - 16:55
    """
    weekday, hhmm = _bkk_hhmm()
    if not weekday:
        return False
    return (945 <= hhmm <= 1230) or (1345 <= hhmm <= 1655)


def is_stock_active() -> bool:
    """Stocks: monitor within FO session windows
      Opens *after* S50IF (MT5 sends first DOM when stock market opens)
      Morning:   from 09:45 (monitor) → collect on first DOM → until 12:30
      Afternoon: from 13:45 (monitor) → collect on first DOM → until 16:30
    """
    weekday, hhmm = _bkk_hhmm()
    if not weekday:
        return False
    return (945 <= hhmm <= 1230) or (1345 <= hhmm <= 1630)


# ── Main ───────────────────────────────────────────────────────────
def main():
    init_mt5()

    # ── Discover symbols
    fo_syms    = discover_futures_options()   # Tick + DOM
    stock_syms = discover_stock_symbols()     # DOM only
    all_syms   = fo_syms + stock_syms

    # ── แบ่ง stock เป็น 2 กลุ่มตาม capture strategy ──────────────
    # HIGH: event-driven (hash) เหมือน S50IF — ไม่พลาดแม้แต่ event เดียว
    # MED/LOW: time-based ThreadPool — เพียงพอสำหรับหุ้นที่ DOM เปลี่ยนช้ากว่า
    high_stock_syms = [s for s in stock_syms if s in HIGH_DOM_STOCKS]
    time_stock_syms = [s for s in stock_syms if s not in HIGH_DOM_STOCKS]

    subscribe_dom(all_syms)

    tick_buffers     = {s: [] for s in fo_syms}       # futures + options only
    dom_buffers      = {s: [] for s in all_syms}      # ทุก symbol
    last_tick_ts     = {s: datetime.utcnow() - timedelta(minutes=1) for s in fo_syms}
    last_flush           = datetime.utcnow()
    last_sym_refresh     = datetime.utcnow()
    prev_dom_hash: dict  = {}                         # FO/Options/HIGH stocks: hash สำหรับ event-driven
    last_dom_snap_stocks_ts: dict = {}                # MED/LOW stocks: timestamp ของ snap ล่าสุด
    last_stock_sweep     = datetime.min               # เวลา ThreadPool sweep ล่าสุด
    stock_executor       = ThreadPoolExecutor(max_workers=8)

    log.info("Collector started. Ctrl+C to stop.")
    log.info(
        f"[EVENT-DRIVEN]  FO+Options: {len(fo_syms)} syms | HIGH stocks: {len(high_stock_syms)} syms\n"
        f"[TIME-BASED]    MED: {len([s for s in time_stock_syms if s in MED_DOM_STOCKS])} @ 500ms | "
        f"LOW: {len([s for s in time_stock_syms if s not in MED_DOM_STOCKS])} @ 1s"
    )

    try:
        while True:
            now      = datetime.utcnow()
            date_str = today_str()

            # ── MT5 reconnect guard ──────────────────────────────
            if mt5.terminal_info() is None:
                log.warning("MT5 disconnected — reconnecting...")
                try:
                    init_mt5()
                    subscribe_dom(all_syms)
                    prev_dom_hash.clear()
                    log.info("MT5 reconnected OK")
                except Exception as e:
                    log.error(f"Reconnect failed: {e} — retry in 30s")
                    time.sleep(30)
                    continue

            if not is_fo_open() and not is_stock_active():
                log.info("All sessions closed — sleeping 60s")
                time.sleep(60)
                continue

            # ── Re-discover options/stocks ──────────────────────
            if (now - last_sym_refresh).total_seconds() >= SYMBOL_REFRESH_MIN * 60:
                new_fo = discover_futures_options()
                added  = [s for s in new_fo if s not in fo_syms]
                if added:
                    log.info(f"New options: {added}")
                    subscribe_dom(added)
                    for s in added:
                        tick_buffers[s] = []
                        dom_buffers[s]  = []
                        last_tick_ts[s] = now - timedelta(minutes=1)
                    fo_syms.extend(added)
                last_sym_refresh = now

            # ── Tick: Futures + Options (only when FO session open)
            if is_fo_open():
                for sym in fo_syms:
                    df = collect_ticks(sym, last_tick_ts[sym])
                    if not df.empty:
                        tick_buffers[sym].append(df)
                        last_tick_ts[sym] = df["time_msc"].max().to_pydatetime()

            # ── DOM: Futures+Options — event-driven (10ms loop)
            # snap ทันทีที่ hash ของ book เปลี่ยน → ไม่พลาดแม้แต่ event เดียว
            if is_fo_open():
                for sym in fo_syms:
                    h = _dom_hash(sym)
                    if h is not None and h != prev_dom_hash.get(sym):
                        df = snapshot_dom(sym)
                        if not df.empty:
                            dom_buffers[sym].append(df)
                        prev_dom_hash[sym] = h

            # ── DOM: HIGH stocks — event-driven เหมือน FO (stock session)
            # DELTA, KBANK, AOT ฯลฯ มี DOM เปลี่ยนเร็ว → ใช้ hash เหมือนกัน
            if is_stock_active():
                for sym in high_stock_syms:
                    h = _dom_hash(sym)
                    if h is not None and h != prev_dom_hash.get(sym):
                        df = snapshot_dom(sym)
                        if not df.empty:
                            dom_buffers[sym].append(df)
                        prev_dom_hash[sym] = h

            # ── DOM: MED+LOW stocks — time-based ThreadPool (50ms sweep)
            # หุ้นที่ DOM เปลี่ยนช้ากว่า → ไม่จำเป็นต้อง event-driven
            if is_stock_active() and (now - last_stock_sweep).total_seconds() >= 0.05:
                snap_now = datetime.utcnow()
                args_list = [
                    (sym, snap_now, last_dom_snap_stocks_ts.get(sym, datetime.min))
                    for sym in time_stock_syms
                ]
                for sym, df in stock_executor.map(_poll_stock_dom, args_list):
                    if df is not None:
                        dom_buffers[sym].append(df)
                        last_dom_snap_stocks_ts[sym] = snap_now
                last_stock_sweep = now

            # ── Flush to Parquet ทุก TICK_FLUSH_MIN ─────────────
            if (now - last_flush).total_seconds() >= TICK_FLUSH_MIN * 60:
                # Tick: futures + options
                for sym in fo_syms:
                    if tick_buffers[sym]:
                        df = pd.concat(tick_buffers[sym], ignore_index=True)
                        save_parquet(df, OUT_DIR / "ticks" / sym / f"{date_str}.parquet")
                        log.info(f"  Tick {sym}: +{len(df)} rows")
                        tick_buffers[sym] = []

                # DOM: ทุก symbol
                for sym in fo_syms + stock_syms:
                    if dom_buffers[sym]:
                        df = pd.concat(dom_buffers[sym], ignore_index=True)
                        save_parquet(df, OUT_DIR / "dom" / sym / f"{date_str}.parquet")
                        log.info(f"  DOM  {sym}: +{len(df)} rows")
                        dom_buffers[sym] = []

                last_flush = now

            time.sleep(0.01)  # 10ms loop — FO event-driven change detection

    except KeyboardInterrupt:
        log.info("Stopping...")
    finally:
        stock_executor.shutdown(wait=False)
        for sym in fo_syms:
            if tick_buffers.get(sym):
                df = pd.concat(tick_buffers[sym], ignore_index=True)
                save_parquet(df, OUT_DIR / "ticks" / sym / f"{today_str()}.parquet")
        for sym in fo_syms + stock_syms:
            if dom_buffers.get(sym):
                df = pd.concat(dom_buffers[sym], ignore_index=True)
                save_parquet(df, OUT_DIR / "dom" / sym / f"{today_str()}.parquet")
        unsubscribe_dom(fo_syms + stock_syms)
        mt5.shutdown()
        log.info("Done.")


if __name__ == "__main__":
    main()
