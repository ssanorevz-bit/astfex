//+------------------------------------------------------------------+
//| DOM_Collector.mq5                                                |
//| เก็บ DOM สำหรับ S50IF_CON + S50 Options ทุก Strike             |
//|                                                                  |
//| v3.0 Improvements:                                               |
//|   1. Timestamp ms แม่นยำ (GetMicrosecondCount ไม่ใช่ GetTickCount)|
//|   2. Hash dedup — เขียนเฉพาะเมื่อ DOM เปลี่ยนจริง              |
//|   3. Buffered flush ทุก 50ms แทน flush ทุก event               |
//|   4. Market hours guard — หยุดเขียนนอกเวลาซื้อขาย              |
//|   5. File error auto-recovery                                    |
//|                                                                  |
//| วิธีติดตั้ง:                                                     |
//|   1. วางไฟล์นี้ใน:                                              |
//|      %APPDATA%\MetaQuotes\Terminal\<ID>\MQL5\Experts\            |
//|   2. กด Compile (F7) ใน MetaEditor                              |
//|   3. ลาก EA ไปวางบน chart S50IF ใดก็ได้                        |
//|   5. EA จะสร้างไฟล์ dom_live.csv ใน:                           |
//|      %APPDATA%\MetaQuotes\Terminal\<ID>\MQL5\Files\              |
//+------------------------------------------------------------------+
#property copyright "Quant"
#property version   "3.00"
#property strict
#property description "DOM Collector v3 — accurate ms, hash dedup, buffered flush"

//── Input Parameters ──────────────────────────────────────────────
input string   OutFileName      = "dom_live.csv"; // ชื่อไฟล์ output
input bool     CollectOptions   = true;           // เก็บ S50 Options ด้วย
input bool     CollectFutures   = true;           // เก็บ S50IF_CON
input bool     LogToJournal     = true;           // แสดง log ใน Experts tab
input int      FlushIntervalMs  = 50;             // flush ทุก N ms (ลด disk I/O)
input bool     MarketHoursOnly  = true;           // เขียนเฉพาะเวลาตลาดเปิด

//── Globals ───────────────────────────────────────────────────────
int      g_fh          = INVALID_HANDLE;
string   g_symbols[];
int      g_sym_count   = 0;
ulong    g_last_flush_mcs = 0;          // MCS ของ flush ล่าสุด

// Timestamp reference (fix GetTickCount bug)
ulong    g_init_mcs    = 0;
datetime g_init_sec    = 0;

// Hash table สำหรับ dedup — เก็บ hash ของ DOM ล่าสุดแต่ละ symbol
// MQL5 ไม่มี dict → ใช้ parallel arrays
string   g_hash_syms[];
ulong    g_hash_vals[];
int      g_hash_count  = 0;

//── Event counter (detect missed events) ──────────────────────────
long     g_event_count = 0;
long     g_skip_dedup  = 0;   // events ที่ skip เพราะ DOM ไม่เปลี่ยน
long     g_skip_hours  = 0;   // events ที่ skip เพราะนอกเวลาตลาด

//+------------------------------------------------------------------+
//| EA Init                                                          |
//+------------------------------------------------------------------+
int OnInit()
  {
   // Init timestamp reference FIRST
   g_init_sec = TimeCurrent();
   g_init_mcs = GetMicrosecondCount();
   g_last_flush_mcs = g_init_mcs;

   // เปิดไฟล์
   if(!OpenFile())
      return INIT_FAILED;

   // Discover + subscribe
   DiscoverAndSubscribe();

   if(LogToJournal)
      Print("[DOM_Collector v3] Started — ", g_sym_count,
            " symbols | flush=", FlushIntervalMs, "ms | dedup=ON | file=", OutFileName);

   // Timer: flush buffer + re-discover options ทุก 30 นาที
   // แต่เรา override ด้วย FlushIntervalMs ใน OnBookEvent
   EventSetMillisecondTimer(FlushIntervalMs);

   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| EA Deinit                                                        |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();

   // Unsubscribe DOM
   for(int i = 0; i < g_sym_count; i++)
      MarketBookRelease(g_symbols[i]);

   // Final flush + close
   if(g_fh != INVALID_HANDLE)
     {
      FileFlush(g_fh);
      FileClose(g_fh);
      g_fh = INVALID_HANDLE;
     }

   if(LogToJournal)
      Print("[DOM_Collector v3] Stopped. events=", g_event_count,
            " dedup_skip=", g_skip_dedup,
            " hours_skip=", g_skip_hours);
  }

//+------------------------------------------------------------------+
//| DOM Event — เรียกทุกครั้งที่ Order Book เปลี่ยน               |
//+------------------------------------------------------------------+
void OnBookEvent(const string &symbol)
  {
   g_event_count++;

   if(!IsTracked(symbol))
      return;

   // ── [Guard 1] Market hours check ──────────────────────────────
   if(MarketHoursOnly && !IsMarketOpen())
     {
      g_skip_hours++;
      return;
     }

   // ── [Guard 2] File handle check + auto-recovery ───────────────
   if(g_fh == INVALID_HANDLE)
     {
      if(!OpenFile())
         return;   // ถ้า reopen ไม่ได้ → skip event นี้
     }

   // ── อ่าน DOM snapshot ────────────────────────────────────────
   MqlBookInfo book[];
   if(!MarketBookGet(symbol, book))
      return;

   int sz = ArraySize(book);
   if(sz <= 0)
      return;

   // ── [Guard 3] Hash dedup — skip ถ้า DOM ไม่เปลี่ยน ───────────
   ulong new_hash = ComputeHash(book, sz);
   ulong old_hash = GetHash(symbol);
   if(new_hash == old_hash)
     {
      g_skip_dedup++;
      return;
     }
   SetHash(symbol, new_hash);

   // ── เขียน DOM rows ───────────────────────────────────────────
   int levels = (sz > 20) ? 20 : sz;
   string ts  = TimestampMs();

   for(int i = 0; i < levels; i++)
     {
      if(i >= ArraySize(book))
         break;

      string t = "";
      if(book[i].type == BOOK_TYPE_SELL)            t = "ask";
      else if(book[i].type == BOOK_TYPE_BUY)        t = "bid";
      else if(book[i].type == BOOK_TYPE_SELL_MARKET) t = "ask_mkt";
      else if(book[i].type == BOOK_TYPE_BUY_MARKET)  t = "bid_mkt";
      else continue;

      FileWrite(g_fh, ts, symbol, t,
                DoubleToString(book[i].price, 2),
                IntegerToString((long)book[i].volume));
     }

   // ── [Improvement] Buffered flush — ไม่ flush ทุก event ────────
   // flush ก็ต่อเมื่อ FlushIntervalMs ผ่านไปแล้ว
   ulong now_mcs = GetMicrosecondCount();
   if(now_mcs - g_last_flush_mcs >= (ulong)FlushIntervalMs * 1000)
     {
      FileFlush(g_fh);
      g_last_flush_mcs = now_mcs;
     }
  }

//+------------------------------------------------------------------+
//| Timer — flush buffer + re-discover options ทุก 30 นาที         |
//+------------------------------------------------------------------+
void OnTimer()
  {
   // Flush buffer ถ้าค้างอยู่
   if(g_fh != INVALID_HANDLE)
      FileFlush(g_fh);

   // Re-discover options (ทุก 1800 timer ticks = 30 นาที ที่ 50ms/tick)
   static int s_timer_count = 0;
   s_timer_count++;
   if(s_timer_count >= 1800 / (FlushIntervalMs / 1000.0 < 1 ? 1 : FlushIntervalMs / 1000))
     {
      DiscoverAndSubscribe();
      s_timer_count = 0;
     }
  }

//+------------------------------------------------------------------+
//| ตรวจว่าตลาดเปิดอยู่ไหม (BKK time)                             |
//| Futures: Morning 09:45-12:30, Afternoon 13:45-16:55             |
//+------------------------------------------------------------------+
bool IsMarketOpen()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent() + 7 * 3600, dt);  // UTC+7 = BKK
   if(dt.day_of_week == 0 || dt.day_of_week == 6)
      return false;  // weekend
   int hhmm = dt.hour * 100 + dt.min;
   return (hhmm >= 945 && hhmm <= 1230) ||
          (hhmm >= 1345 && hhmm <= 1655);
  }

//+------------------------------------------------------------------+
//| เปิดไฟล์ output (หรือ reopen หลัง error)                       |
//+------------------------------------------------------------------+
bool OpenFile()
  {
   if(g_fh != INVALID_HANDLE)
     {
      FileClose(g_fh);
      g_fh = INVALID_HANDLE;
     }

   g_fh = FileOpen(OutFileName,
                   FILE_WRITE | FILE_CSV | FILE_SHARE_READ | FILE_ANSI,
                   ',');
   if(g_fh == INVALID_HANDLE)
     {
      Print("[DOM_Collector v3] ERROR: เปิดไฟล์ไม่ได้ code=", GetLastError());
      return false;
     }

   FileWrite(g_fh, "timestamp_ms", "symbol", "type", "price", "volume");
   FileFlush(g_fh);
   return true;
  }

//+------------------------------------------------------------------+
//| คำนวณ hash ของ DOM snapshot (เพื่อ dedup)                      |
//+------------------------------------------------------------------+
ulong ComputeHash(const MqlBookInfo &book[], int sz)
  {
   ulong h = 14695981039346656037ULL;  // FNV-1a offset basis
   int   n = (sz > 20) ? 20 : sz;
   for(int i = 0; i < n; i++)
     {
      // hash price + volume + type
      ulong pv = (ulong)(book[i].price * 10) ^ ((ulong)book[i].volume << 20) ^ (ulong)book[i].type;
      h ^= pv;
      h *= 1099511628211ULL;  // FNV prime
     }
   return h;
  }

//+------------------------------------------------------------------+
//| Hash table helpers (parallel arrays)                            |
//+------------------------------------------------------------------+
ulong GetHash(const string &sym)
  {
   for(int i = 0; i < g_hash_count; i++)
      if(g_hash_syms[i] == sym)
         return g_hash_vals[i];
   return 0;
  }

void SetHash(const string &sym, ulong val)
  {
   for(int i = 0; i < g_hash_count; i++)
      if(g_hash_syms[i] == sym)
        {
         g_hash_vals[i] = val;
         return;
        }
   // ไม่เจอ → เพิ่มใหม่
   ArrayResize(g_hash_syms, g_hash_count + 1);
   ArrayResize(g_hash_vals, g_hash_count + 1);
   g_hash_syms[g_hash_count] = sym;
   g_hash_vals[g_hash_count] = val;
   g_hash_count++;
  }

//+------------------------------------------------------------------+
//| ค้นหา S50 symbols + subscribe DOM                               |
//+------------------------------------------------------------------+
void DiscoverAndSubscribe()
  {
   string new_syms[];
   int    new_count = 0;

   if(CollectFutures)
      AddUnique(new_syms, new_count, "S50IF_CON");

   if(CollectOptions)
     {
      int total = SymbolsTotal(false);
      for(int i = 0; i < total; i++)
        {
         string name = SymbolName(i, false);
         if(IsS50Option(name))
            AddUnique(new_syms, new_count, name);
        }
     }

   int added = 0;
   for(int i = 0; i < new_count; i++)
      if(!IsTracked(new_syms[i]))
        {
         if(MarketBookAdd(new_syms[i]))
           {
            AddUnique(g_symbols, g_sym_count, new_syms[i]);
            added++;
           }
        }

   if(added > 0 && LogToJournal)
      Print("[DOM_Collector v3] +", added, " symbols subscribed. Total=", g_sym_count);
  }

//+------------------------------------------------------------------+
//| ตรวจว่าชื่อ symbol เป็น S50 Option หรือเปล่า                  |
//+------------------------------------------------------------------+
bool IsS50Option(const string &name)
  {
   if(StringLen(name) < 9)              return false;
   if(StringSubstr(name, 0, 3) != "S50") return false;
   string month_codes = "HJKMNQUVXZ";
   string m = StringSubstr(name, 3, 1);
   if(StringFind(month_codes, m) < 0)  return false;
   if(StringFind(name, "C", 5) < 0 && StringFind(name, "P", 5) < 0)
      return false;
   return true;
  }

//+------------------------------------------------------------------+
//| ตรวจว่า symbol อยู่ใน tracked list ไหม                        |
//+------------------------------------------------------------------+
bool IsTracked(const string &sym)
  {
   for(int i = 0; i < g_sym_count; i++)
      if(g_symbols[i] == sym)
         return true;
   return false;
  }

//+------------------------------------------------------------------+
//| เพิ่ม symbol ลง array โดยไม่ซ้ำ                               |
//+------------------------------------------------------------------+
void AddUnique(string &arr[], int &count, const string &sym)
  {
   for(int i = 0; i < count; i++)
      if(arr[i] == sym)
         return;
   ArrayResize(arr, count + 1);
   arr[count] = sym;
   count++;
  }

//+------------------------------------------------------------------+
//| Timestamp แม่นยำ millisecond (fix GetTickCount bug)             |
//| ใช้ GetMicrosecondCount() diff จาก init reference               |
//+------------------------------------------------------------------+
string TimestampMs()
  {
   ulong    elapsed_mcs = GetMicrosecondCount() - g_init_mcs;
   datetime now_sec     = g_init_sec + (datetime)(elapsed_mcs / 1000000);
   int      ms          = (int)((elapsed_mcs % 1000000) / 1000);

   MqlDateTime dt;
   TimeToStruct(now_sec, dt);

   return StringFormat("%04d-%02d-%02d %02d:%02d:%02d.%03d",
                       dt.year, dt.mon, dt.day,
                       dt.hour, dt.min, dt.sec,
                       ms);
  }

//+------------------------------------------------------------------+
//| OnTick — ไม่ได้ใช้ แต่ต้องมีเพื่อให้ EA compile ได้          |
//+------------------------------------------------------------------+
void OnTick() { }
//+------------------------------------------------------------------+
