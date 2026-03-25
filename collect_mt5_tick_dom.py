"""
collect_mt5_tick_dom.py
━━━━━━━━━━━━━━━━━━━━━━━
เก็บข้อมูล จาก MT5 Toptrader:

  [FUTURES]  S50IF_CON   → Tick + DOM (10 levels via EA CSV)
  [OPTIONS]  S50 ทุกซีรี่ → Tick + DOM (10 levels via EA CSV)
  [STOCKS]   SET50 ทุกตัว → DOM เท่านั้น (Python API, 5 levels)

DOM สำหรับ Futures/Options:
  ไม่ได้ใช้ mt5.market_book_get() แล้ว (จำกัดที่ 5 levels)
  อ่านจาก dom_live.csv ที่ MQL5 EA (DOM_Collector.mq5) เขียนแทน
  → ได้ครบ 10 levels จาก TFEX

  วิธีหา path ของ dom_live.csv:
    MT5 → Tools → Options → Expert Advisors → "Open" ข้างๆ Data folder
    หรือ: %APPDATA%\MetaQuotes\Terminal\<ID>\MQL5\Files\dom_live.csv

รัน: python collect_mt5_tick_dom.py

Output (Parquet รายวัน):
  data/ticks/S50IF_CON/2025-03-21.parquet
  data/ticks/S50J25C900/2025-03-21.parquet
  data/dom/S50IF_CON/2025-03-21.parquet   ← 10 bid + 10 ask
  data/dom/ADVANC/2025-03-21.parquet      ← 5 bid + 5 ask (Python API)
  ...
"""
import io
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, Future
import threading

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
TICK_FLUSH_MIN       = 1     # flush Parquet ทุก 1 นาที (ลด memory usage)
PRIORITY_FUTURES     = ["S50IF_CON"]  # poll ก่อน options ทุก loop
MAX_BUFFER_ROWS      = 5000  # emergency flush ถ้า buffer ใหญ่เกิน
SYMBOL_REFRESH_MIN   = 30    # re-discover options/stocks ทุก 30 นาที
OUT_DIR              = Path("C:/quant-s/data")   # absolute path — safe for Task Scheduler
LOG_FILE             = Path("C:/quant-s/collector.log")

# ── DOM via EA CSV (10 levels) ──────────────────────────────────────
# Path ของ dom_live.csv ที่ DOM_Collector.mq5 เขียน
# หาได้จาก MT5 → File → Open Data Folder → MQL5\Files
# แก้ <TERMINAL_ID> ให้ตรงกับ directory ใน %APPDATA%\MetaQuotes\Terminal\
DOM_CSV_PATH = next(
    Path(r"C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal")
    .glob("*/MQL5/Files/dom_live.csv"),
    Path("dom_live.csv")   # fallback ถ้าหาไม่เจอ
)

# Windows reserved device names — ห้ามใช้เป็นชื่อโฟลเดอร์/ไฟล์
WINDOWS_RESERVED = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
}

def is_safe_sym(sym: str) -> bool:
    """Return False ถ้า symbol ชนกับ Windows reserved name"""
    return sym.upper() not in WINDOWS_RESERVED
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

# SET200 Extension — DOM only, LOW tier (1s)
# หุ้น mid-cap ที่น่าสนใจสำหรับ sector rotation และ correlation analysis
SET200_EXTENSION = [
    # Property & Construction
    "CHEWA",  "NOBLE",  "LPN",    "RICHY",  "MJD",    "NC",
    "PRIN",   "TVD",    "LALIN",
    # Finance & Insurance
    "TIDLOR", "BKI",    "CIMBT",  "LHFG",   "NER",
    # Healthcare
    "KLINIQ", "CHG",    "BCH",    "PRINC",  "VIBHA",
    # Food & Agriculture
    "TFG",    "ASIAN",  "NFC",    "BR",     "GFPT",
    # Energy & Utilities
    "HYDRO",  "TPCH",   "ESSO",   "SUSCO",
    # Retail & Service
    "MAKRO",  "BEAUTY", "LASER",  "TNP",
    # Tech & Media
    "HUMAN",  "CI",     "INSET",  "SCI",
    # REITs (monitor institutional flow)
    "CPNREIT","JASIF",  "DIF",    "WHART",  "LHPF",
    # MAI — liquid stocks (sector signals + correlation)
    "JMART",  "SINGER", "SISB",   "PRIME",  "MASTER",
    "FORTH",  "ITEL",   "NUSA",   "CHO",    "UA",    "TNL",
]
# รวม list เดียว
STOCK_SYMBOLS = STOCK_SYMBOLS + [s for s in SET200_EXTENSION if s not in STOCK_SYMBOLS]


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
    """Auto-discover S50IF + S50 Options (ทุก Call/Put ทุก strike, กรอง reserved names)"""
    symbols = ["S50IF_CON"]
    all_syms = mt5.symbols_get(group="*S50*") or []
    for s in all_syms:
        name = s.name
        if not is_safe_sym(name):
            log.warning(f"skip {name} — Windows reserved name")
            continue
        if (name.startswith("S50")
                and len(name) >= 8
                and any(m in name[3:6] for m in "HJKMNQUVXZ")
                and ("C" in name[5:] or "P" in name[5:])):
            symbols.append(name)
    symbols = sorted(set(symbols))
    log.info(f"Futures/Options: {len(symbols)} symbols ({len(symbols)-1} options)")
    return symbols


def discover_stock_symbols() -> list:
    """ตรวจสอบว่า SET50 stocks ตัวไหนมีใน MT5 (กรอง Windows reserved names)"""
    available = []
    for s in STOCK_SYMBOLS:
        if not is_safe_sym(s):
            log.warning(f"skip {s} — Windows reserved name")
            continue
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
    """Snapshot order book via Python API — ใช้สำหรับ STOCKS เท่านั้น (5 levels)
    สำหรับ Futures/Options ใช้ _CSVDOMReader แทน (10 levels จาก EA)"""
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
    """Hash ของ order book ณ ขณะนั้น — ใช้ detect DOM change สำหรับ STOCKS."""
    book = mt5.market_book_get(sym)
    if book is None:
        return None
    return hash(tuple((item.price, item.volume) for item in book))


# ── EA CSV DOM Reader (10 levels) ───────────────────────────────────
class _CSVDOMReader:
    """อ่าน dom_live.csv ที่ DOM_Collector.mq5 เขียน แบบ tail-follow
    (อ่านเฉพาะ bytes ใหม่นับจาก seek position ล่าสุด → ไม่ re-read ทั้งไฟล์)

    CSV format (จาก EA):
        timestamp_ms,symbol,type,price,volume,volume_dbl
        2026-03-25 11:24:20.450,S50IF_CON,bid,874.5,120,120.00
        ...
    """

    _COLS = ["timestamp_ms", "symbol", "type", "price", "volume"]

    def __init__(self, csv_path: Path):
        self._path: Path                        = csv_path
        self._fh:   "io.TextIOWrapper | None"   = None
        self._pos:  int                         = 0   # byte position ของ EOF ตอน init
        self._ok:   bool                        = False
        self._open()

    def _open(self):
        if not self._path.exists():
            log.warning(f"[CSVDOMReader] ไม่พบไฟล์: {self._path}")
            log.warning("  → ตรวจสอบว่า DOM_Collector.mq5 EA รันอยู่ใน MT5")
            return
        try:
            self._fh  = open(self._path, "r", encoding="utf-8", errors="replace")
            self._fh.seek(0, 2)          # seek to EOF — อ่านเฉพาะ rows ใหม่
            self._pos = self._fh.tell()
            self._ok  = True
            log.info(f"[CSVDOMReader] เชื่อมต่อ {self._path}")
        except OSError as e:
            log.warning(f"[CSVDOMReader] เปิดไฟล์ไม่ได้: {e}")

    def read_new(self) -> dict[str, pd.DataFrame]:
        """อ่าน rows ใหม่นับจาก seek ล่าสุด
        Return: dict {symbol → DataFrame} เฉพาะ symbols ที่มี rows ใหม่
        DataFrame columns: timestamp_ms, symbol, type, price, volume, volume_dbl
        """
        if not self._ok:
            self._open()     # retry เปิดไฟล์ (EA อาจยังไม่ได้สร้าง)
            if not self._ok:
                return {}

        # ตรวจว่าไฟล์ถูก truncate (EA restart → เขียนจากต้นใหม่)
        try:
            size = self._path.stat().st_size
        except OSError:
            return {}
        if size < self._pos:
            log.info("[CSVDOMReader] ไฟล์ถูก truncate (EA restart?) — reset seek")
            self._fh.seek(0)
            # อ่านและทิ้ง header
            self._fh.readline()
            self._pos = self._fh.tell()

        self._fh.seek(self._pos)
        chunk = self._fh.read()
        self._pos = self._fh.tell()

        if not chunk.strip():
            return {}

        try:
            df = pd.read_csv(
                io.StringIO(chunk),
                names=self._COLS,
                header=None,
                dtype={"symbol": str, "type": str,
                       "price": float, "volume": float},
                on_bad_lines="skip",
            )
        except Exception as e:
            log.debug(f"[CSVDOMReader] parse error: {e}")
            return {}

        if df.empty:
            return {}

        # แปลง timestamp
        df["timestamp_ms"] = pd.to_datetime(
            df["timestamp_ms"], format="%Y-%m-%d %H:%M:%S.%f", errors="coerce"
        )
        df.dropna(subset=["timestamp_ms"], inplace=True)

        # rename ให้ตรงกับ schema เดิม (ใช้ร่วมกับ stock DOM ได้)
        df.rename(columns={"timestamp_ms": "timestamp"}, inplace=True)

        # group ตาม symbol
        return {sym: grp.reset_index(drop=True)
                for sym, grp in df.groupby("symbol", sort=False)}

    def close(self):
        if self._fh:
            try:
                self._fh.close()
            except OSError:
                pass


def _poll_stock_dom(args: tuple):
    """Poll DOM หุ้น 1 ตัว (รัน parallel ใน ThreadPool).
    Returns (sym, DataFrame | None)
    เพิ่ม hash check → บันทึกเฉพาะเมื่อ DOM เปลี่ยนจริง (ประหยัด storage + ลด noise)
    """
    sym, snap_now, last_ts, prev_hash = args
    if (snap_now - last_ts).total_seconds() < get_dom_interval(sym):
        return sym, None, prev_hash   # ยังไม่ถึง interval → ข้าม
    h = _dom_hash(sym)
    if h is None or h == prev_hash:
        return sym, None, prev_hash   # DOM ไม่เปลี่ยน → ไม่บันทึก
    df = snapshot_dom(sym)
    return sym, (df if not df.empty else None), h


# ── Save ───────────────────────────────────────────────────────────
def save_parquet(df: pd.DataFrame, path: Path):
    # ตรวจ Windows reserved name ใน path components
    for part in path.parts:
        name = part.rstrip(".").upper().split(".")[0]
        if name in WINDOWS_RESERVED:
            log.warning(f"skip save — reserved name in path: {path}")
            return
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


# ── Background flush ───────────────────────────────────────────────
_flush_lock = threading.Lock()
_flush_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="flush")


def _flush_worker(buffers_snapshot: dict, out_dir: Path, date_str: str, kind: str):
    """รัน flush Parquet ใน background thread — ไม่บล็อก main loop"""
    for sym, df in buffers_snapshot.items():
        try:
            save_parquet(df, out_dir / kind / sym / f"{date_str}.parquet")
            log.info(f"  {kind.upper():4s} {sym}: +{len(df)} rows")
        except Exception as e:
            log.warning(f"  {kind.upper():4s} {sym}: flush error — {e}")


# ── Main ───────────────────────────────────────────────────────────
def main():
    init_mt5()

    # ── Discover symbols
    fo_syms    = discover_futures_options()   # Tick + DOM (10 levels via EA CSV)
    stock_syms = discover_stock_symbols()     # DOM only  (5 levels via Python API)
    all_syms   = fo_syms + stock_syms

    # ── Priority: S50IF_CON poll ก่อน options ทุก loop ────────────
    prio_syms   = [s for s in fo_syms if s in PRIORITY_FUTURES]   # S50IF_CON
    other_fo    = [s for s in fo_syms if s not in PRIORITY_FUTURES]  # options

    # ── CSV DOM Reader — อ่าน 10 levels จาก EA ────────────────────
    csv_reader  = _CSVDOMReader(DOM_CSV_PATH)
    fo_sym_set  = set(fo_syms)   # ใช้ fast-lookup สำหรับ filter

    # ── แบ่ง stock เป็น 2 กลุ่มตาม capture strategy ──────────────
    # HIGH: event-driven (hash) เหมือน S50IF — ไม่พลาดแม้แต่ event เดียว
    # MED/LOW: time-based ThreadPool — เพียงพอสำหรับหุ้นที่ DOM เปลี่ยนช้ากว่า
    high_stock_syms = [s for s in stock_syms if s in HIGH_DOM_STOCKS]
    time_stock_syms = [s for s in stock_syms if s not in HIGH_DOM_STOCKS]

    subscribe_dom(stock_syms)  # FO ไม่ต้อง subscribe แล้ว — ใช้ CSV จาก EA

    tick_buffers     = {s: [] for s in fo_syms}       # futures + options only
    dom_buffers      = {s: [] for s in all_syms}      # ทุก symbol
    last_tick_ts     = {s: datetime.utcnow() - timedelta(minutes=1) for s in fo_syms}
    last_flush           = datetime.utcnow()
    last_sym_refresh     = datetime.utcnow()
    prev_dom_hash: dict  = {}                         # HIGH stocks: hash สำหรับ event-driven
    last_dom_snap_stocks_ts: dict = {}                # MED/LOW stocks: timestamp ของ snap ล่าสุด
    last_stock_sweep     = datetime.min               # เวลา ThreadPool sweep ล่าสุด
    stock_executor       = ThreadPoolExecutor(max_workers=8)
    _pending_flush: list[Future] = []                 # track background flush futures
    _loop_times: list[float] = []                     # loop latency monitoring

    log.info("Collector started. Ctrl+C to stop.")
    log.info(
        f"[EA CSV 10-LV]  FO+Options: {len(fo_syms)} syms | path={DOM_CSV_PATH.name}\n"
        f"[EVENT-DRIVEN]  HIGH stocks: {len(high_stock_syms)} syms\n"
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

            _t0 = time.monotonic()

            # ── [PRIORITY] S50IF_CON: Tick ก่อน ─────────────────────
            if is_fo_open():
                for sym in prio_syms:
                    df = collect_ticks(sym, last_tick_ts[sym])
                    if not df.empty:
                        tick_buffers[sym].append(df)
                        last_tick_ts[sym] = df["time_msc"].max().to_pydatetime()

            # ── Tick: Options ─────────────────────────────────────────
            if is_fo_open():
                for sym in other_fo:
                    df = collect_ticks(sym, last_tick_ts[sym])
                    if not df.empty:
                        tick_buffers[sym].append(df)
                        last_tick_ts[sym] = df["time_msc"].max().to_pydatetime()

            # ── DOM: FO + Options — อ่านจาก EA CSV (10 levels) ───────
            # EA เขียน dom_live.csv ทุกครั้งที่ DOM เปลี่ยน (OnBookEvent)
            # Python อ่านแค่ bytes ใหม่ที่ append มาตั้งแต่ read ล่าสุด
            if is_fo_open():
                new_dom = csv_reader.read_new()   # {symbol → DataFrame}
                for sym, df in new_dom.items():
                    if sym in fo_sym_set and not df.empty:
                        dom_buffers[sym].append(df)

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
                    (sym, snap_now,
                     last_dom_snap_stocks_ts.get(sym, datetime.min),
                     prev_dom_hash.get(sym))          # ← ส่ง hash ก่อนหน้าด้วย
                    for sym in time_stock_syms
                ]
                for sym, df, new_hash in stock_executor.map(_poll_stock_dom, args_list):
                    if df is not None:
                        dom_buffers[sym].append(df)
                        last_dom_snap_stocks_ts[sym] = snap_now
                    if new_hash is not None:
                        prev_dom_hash[sym] = new_hash  # ← อัปเดต hash ล่าสุด
                last_stock_sweep = now

            # ── Emergency flush ถ้า buffer ใหญ่เกินไป ──────────
            for sym in fo_syms:
                if len(tick_buffers.get(sym, [])) > MAX_BUFFER_ROWS:
                    try:
                        df = pd.concat(tick_buffers[sym], ignore_index=True)
                        save_parquet(df, OUT_DIR / "ticks" / sym / f"{date_str}.parquet")
                        tick_buffers[sym] = []
                    except MemoryError:
                        tick_buffers[sym] = []  # drop และเดินหน้าต่อ

            # ── Loop latency monitoring ─────────────────────────
            _loop_ms = (time.monotonic() - _t0) * 1000
            _loop_times.append(_loop_ms)
            if len(_loop_times) >= 1000:  # log ทุก ~10 วินาที
                avg_ms = sum(_loop_times) / len(_loop_times)
                max_ms = max(_loop_times)
                if avg_ms > 50:  # warn ถ้า loop ช้าเกิน 50ms
                    log.warning(f"Loop slow: avg={avg_ms:.1f}ms max={max_ms:.1f}ms (target=10ms)")
                else:
                    log.debug(f"Loop: avg={avg_ms:.1f}ms max={max_ms:.1f}ms")
                _loop_times.clear()

            # ── Flush to Parquet ทุก TICK_FLUSH_MIN — background thread ──
            # ย้ายไป background เพื่อไม่บล็อก main loop
            if (now - last_flush).total_seconds() >= TICK_FLUSH_MIN * 60:
                # รอ flush เก่าเสร็จก่อน (ถ้ายังรัน)
                for f in _pending_flush:
                    try:
                        f.result(timeout=5)
                    except Exception as e:
                        log.warning(f"Flush error: {e}")
                _pending_flush.clear()

                # สร้าง snapshot ของ buffer แล้วเคลียร์ buffer ทันที
                # → main loop ไม่ต้องรอ disk write
                tick_snap: dict[str, pd.DataFrame] = {}
                dom_snap:  dict[str, pd.DataFrame] = {}

                for sym in fo_syms:
                    if tick_buffers[sym]:
                        try:
                            tick_snap[sym] = pd.concat(tick_buffers[sym], ignore_index=True)
                        except MemoryError:
                            log.warning(f"  Tick {sym}: MemoryError — buffer dropped")
                        tick_buffers[sym] = []

                for sym in fo_syms + stock_syms:
                    if dom_buffers[sym]:
                        try:
                            dom_snap[sym] = pd.concat(dom_buffers[sym], ignore_index=True)
                        except MemoryError:
                            log.warning(f"  DOM {sym}: MemoryError — buffer dropped")
                        dom_buffers[sym] = []

                # submit flush ไป background
                if tick_snap:
                    _pending_flush.append(
                        _flush_executor.submit(_flush_worker, tick_snap, OUT_DIR, date_str, "ticks")
                    )
                if dom_snap:
                    _pending_flush.append(
                        _flush_executor.submit(_flush_worker, dom_snap, OUT_DIR, date_str, "dom")
                    )

                last_flush = now

            time.sleep(0.01)  # 10ms loop — FO event-driven change detection

    except KeyboardInterrupt:
        log.info("Stopping...")
    finally:
        csv_reader.close()
        stock_executor.shutdown(wait=False)
        # รอ background flush เสร็จก่อน shutdown
        for f in _pending_flush:
            try:
                f.result(timeout=10)
            except Exception as e:
                log.warning(f"Final flush error: {e}")
        # Final flush — synchronous ตอน shutdown
        for sym in fo_syms:
            if tick_buffers.get(sym):
                df = pd.concat(tick_buffers[sym], ignore_index=True)
                save_parquet(df, OUT_DIR / "ticks" / sym / f"{today_str()}.parquet")
        for sym in fo_syms + stock_syms:
            if dom_buffers.get(sym):
                df = pd.concat(dom_buffers[sym], ignore_index=True)
                save_parquet(df, OUT_DIR / "dom" / sym / f"{today_str()}.parquet")
        _flush_executor.shutdown(wait=True)
        unsubscribe_dom(stock_syms)   # unsubscribe stocks เท่านั้น
        mt5.shutdown()
        log.info("Done.")


if __name__ == "__main__":
    main()
