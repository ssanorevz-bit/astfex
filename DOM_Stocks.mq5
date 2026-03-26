//+------------------------------------------------------------------+
//| DOM_Stocks.mq5                                                   |
//| EA #5 — Remaining stocks (~136), flush 100ms, no dedup          |
//| v4: volume_dbl, file append, microsecond, heartbeat, re-sync    |
//|                                                                  |
//| ไม่รวม: DELTA (EA #2) + 21 HIGH stocks (EA #3)                 |
//+------------------------------------------------------------------+
#property copyright "Quant"
#property version   "4.00"
#property strict
#property description "DOM Collector #5 — Remaining stocks | flush 100ms"

#define OUT_FILE        "dom_stocks.csv"
#define FLUSH_MS        100
#define HEARTBEAT_SEC   30
#define RESYNC_SEC      1800

// Stocks ที่ assign ให้ EA #5 (ไม่รวม DELTA และ HIGH_STOCKS)
string STOCK_LIST[] = {
   "TOP","OR","SCB","PTT","CPN","CPF","HMPRO","KBANK","TIDLOR","GPSC",
   "CRC","SAWAD","TISCO","KKP","BEM","BBL","EA","KTC","THAI","LH",
   "BGRIM","BCH","MTC","BCP","BTS","GUNKUL","SPRC","AMATA","BA","AWC",
   "ICHI","CHG","TU","BJC","PTG","CENTEL","OSP","CK","CBG","STA",
   "TCAP","ERW","M","THCOM","BCPG","AP","SIRI","EGCO","AAV","TOA",
   "RATCH","PSL","STGT","DIF","VGI","GFPT","EASTW","BAM","GLOBAL",
   "PLANB","JMT","JAS","NER","PRM","CPNREIT","QH","MAJOR","JMART",
   "SPALI","WHAUP","TVO","INSET","HUMAN","EPG","TTW","CKP","STPI",
   "TTA","TASCO","MEGA","ORI","AEONTS","SINGER","WHART","SISB","BLA",
   "TQM","BPP","TPIPL","TPCH","FORTH","THANI","SUPER","SPCG","BEAUTY",
   "THG","TKN","TPIPP","MBK","BLAND","MASTER","ITEL","ASIAN","BEC",
   "SUSCO","PSH","UNIQ","LHFG","VIBHA","ITD","KLINIQ","BAY","LPN",
   "SAMART","S","SGP","TNP","RS","NOBLE","RICHY","VNG","HYDRO","LALIN",
   "PRINC","BR","PRIME","SCI","MJD","CI","PRIN","NC","CHEWA","TTCL",
   "CHO","TNL",
   // SET200 extension
   "AAV","ADVANC","AEONTS","AMATA","AOT","AP","AWC","BCPG","BDMS",
   "BEC","BEM","BGRIM","BH","BJC","BLA","BLAND","BPP",
   "CPNREIT","DIF","EASTW","EGCO","EPG","ERW",
   "FORTH","GFPT","GLOBAL","GPSC","GUNKUL","HMPRO",
   "INSET","IRPC","JAS","JMT","KCE","KEX","KKP","KLINIQ",
   "LALIN","LH","LPN","M","MAJOR","MBK","MEGA","MJD","MTC",
   "NC","NER","NOBLE","ORI","OSP","PLANB","PRM","PSH","PSL",
   "PTG","QH","RATCH","RICHY","RS","S","SAMART","SAWAD",
   "SCGP","SGP","SINGER","SIRI","SISB","SPALI","SPCG","SPRC",
   "STA","STGT","STPI","SUPER","SUSCO","TASCO","TCAP","TFG",
   "THAI","THANI","THCOM","THG","TIDLOR","TISCO","TKN","TNL",
   "TNP","TOA","TPCH","TPIPL","TPIPP","TQM","TTA","TTCL",
   "TTW","TU","TVO","UNIQ","VGI","VIBHA","VNG","WHA","WHART","WHAUP"
};

int      g_fh          = INVALID_HANDLE;
ulong    g_init_mcs    = 0;
datetime g_init_sec    = 0;
ulong    g_last_flush  = 0;
datetime g_last_hb     = 0;
datetime g_last_resync = 0;
long     g_events      = 0;
// subscribed symbols (subset of STOCK_LIST ที่ MT5 รู้จัก)
string   g_subs[];
int      g_sub_count   = 0;

// Excluded symbols (อยู่ใน EA อื่นแล้ว)
string EXCLUDED[] = {
   "DELTA",
   "GULF","BDMS","HANA","BANPU","PTTEP","IVL","AOT","KTB","KCE",
   "TTB","MINT","SCGP","IRPC","SCC","WHA","TFG","BH","TRUE",
   "CPALL","ADVANC","PTTGC"
};

//+------------------------------------------------------------------+
int OnInit()
  {
   g_init_sec    = TimeCurrent();
   g_init_mcs    = GetMicrosecondCount();
   g_last_flush  = g_init_mcs;
   g_last_hb     = g_init_sec;
   g_last_resync = g_init_sec;

   if(!OpenFile()) return INIT_FAILED;

   // subscribe unique, non-excluded stocks
   int ok = 0;
   int n  = ArraySize(STOCK_LIST);
   for(int i = 0; i < n; i++)
     {
      string s = STOCK_LIST[i];
      if(IsExcluded(s) || IsSubscribed(s)) continue;
      if(mt5Symbol(s) && MarketBookAdd(s))
        {
         ArrayResize(g_subs, g_sub_count+1);
         g_subs[g_sub_count++] = s;
         ok++;
        }
     }

   EventSetMillisecondTimer(FLUSH_MS);
   Print("[STOCKS] Started | ", ok, " symbols | flush=", FLUSH_MS, "ms | file=", OUT_FILE);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   for(int i = 0; i < g_sub_count; i++) MarketBookRelease(g_subs[i]);
   if(g_fh != INVALID_HANDLE)
     { FileFlush(g_fh); FileClose(g_fh); g_fh = INVALID_HANDLE; }
   Print("[STOCKS] Stopped. events=", g_events);
  }

//+------------------------------------------------------------------+
void OnBookEvent(const string &symbol)
  {
   if(!IsSubscribed(symbol)) return;
   if(g_fh == INVALID_HANDLE && !OpenFile()) return;
   MqlBookInfo book[];
   if(!MarketBookGet(symbol, book)) return;
   int sz = ArraySize(book);
   if(sz <= 0) return;

   g_events++;
   string ts = TimestampUs();
   int levels = (sz > 20) ? 20 : sz;

   for(int i = 0; i < levels; i++)
     {
      if(i >= ArraySize(book)) break;
      string t = BookType(book[i].type);
      if(t == "") continue;
      FileWrite(g_fh, ts, symbol, t,
                DoubleToString(book[i].price, 2),
                IntegerToString((long)book[i].volume),
                DoubleToString(book[i].volume_dbl, 2));
     }

   ulong now = GetMicrosecondCount();
   if(now - g_last_flush >= (ulong)FLUSH_MS * 1000)
     { FileFlush(g_fh); g_last_flush = now; }
  }

//+------------------------------------------------------------------+
void OnTimer()
  {
   datetime now = TimeCurrent();
   if(g_fh != INVALID_HANDLE) FileFlush(g_fh);

   if(now - g_last_hb >= HEARTBEAT_SEC)
     {
      if(g_fh != INVALID_HANDLE)
         FileWrite(g_fh, TimestampUs(), "STOCKS", "HEARTBEAT", "", "", "");
      g_last_hb = now;
     }

   if(now - g_last_resync >= RESYNC_SEC)
     { g_init_sec = now; g_init_mcs = GetMicrosecondCount(); g_last_resync = now; }
  }

//+------------------------------------------------------------------+
bool IsExcluded(const string &sym)
  {
   for(int i = 0; i < ArraySize(EXCLUDED); i++)
      if(EXCLUDED[i] == sym) return true;
   return false;
  }

bool IsSubscribed(const string &sym)
  {
   for(int i = 0; i < g_sub_count; i++)
      if(g_subs[i] == sym) return true;
   return false;
  }

bool mt5Symbol(const string &sym)
  { return SymbolSelect(sym, true); }

bool OpenFile()
  {
   if(g_fh != INVALID_HANDLE) { FileClose(g_fh); g_fh = INVALID_HANDLE; }
   g_fh = FileOpen(OUT_FILE, FILE_READ|FILE_WRITE|FILE_CSV|FILE_SHARE_READ|FILE_ANSI, ',');
   if(g_fh == INVALID_HANDLE)
     {
      g_fh = FileOpen(OUT_FILE, FILE_WRITE|FILE_CSV|FILE_SHARE_READ|FILE_ANSI, ',');
      if(g_fh == INVALID_HANDLE)
        { Print("[STOCKS] ERROR opening file: ", GetLastError()); return false; }
      FileWrite(g_fh, "timestamp_us","symbol","type","price","volume","volume_dbl");
      FileFlush(g_fh); return true;
     }
   FileSeek(g_fh, 0, SEEK_END); return true;
  }

string TimestampUs()
  {
   ulong    e   = GetMicrosecondCount() - g_init_mcs;
   datetime sec = g_init_sec + (datetime)(e / 1000000);
   int      us  = (int)(e % 1000000);
   MqlDateTime dt; TimeToStruct(sec, dt);
   return StringFormat("%04d-%02d-%02d %02d:%02d:%02d.%06d",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec, us);
  }

string BookType(ENUM_BOOK_TYPE t)
  {
   switch(t)
     {
      case BOOK_TYPE_SELL:         return "ask";
      case BOOK_TYPE_BUY:          return "bid";
      case BOOK_TYPE_SELL_MARKET:  return "ask_mkt";
      case BOOK_TYPE_BUY_MARKET:   return "bid_mkt";
      default:                     return "";
     }
  }

void OnTick() { }
//+------------------------------------------------------------------+
