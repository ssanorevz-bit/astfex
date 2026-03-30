//+------------------------------------------------------------------+
//|                                             Quant_S_Bridge.mq5   |
//|                                     Copyright 2026, Ratchaphop   |
//|                                             https://quant-s.com  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Quant-S"
#property link      "https://quant-s.com"
#property version   "2.01"
#property strict

input string ServerURL      = "http://192.168.1.37:5001";
input int    PollIntervalMs = 5000;       // Poll every 5 seconds
input int    MaxBarsPerChunk = 2000;
input int    MaxTicksPerRequest = 100000;
input int    RequestTimeoutMs = 2000;     // WebRequest timeout (keep short!)

//+------------------------------------------------------------------+
int OnInit()
  {
   EventSetMillisecondTimer(PollIntervalMs);
   Print("Quant-S Bridge v2.01 Started. Polling: ", ServerURL);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   Print("Quant-S Bridge EA Stopped. Reason: ", reason);
  }

//+------------------------------------------------------------------+
void OnTick() { }

//+------------------------------------------------------------------+
void OnTimer()
  {
   PollCommands();
  }

//+------------------------------------------------------------------+
void PollCommands()
  {
   char   post[], result[];
   string resHeaders;

   ResetLastError();
   int res = WebRequest("GET", ServerURL + "/", NULL, NULL,
                        RequestTimeoutMs, post, 0, result, resHeaders);

   if(res == 200)
     {
      string responseText = CharArrayToString(result);
      if(StringFind(responseText, "\"action\": \"none\"") == -1 &&
         StringFind(responseText, "\"action\":\"none\"")  == -1)
        {
         Print("Command Received: ", responseText);
         ProcessCommand(responseText);
        }
     }
   else
     {
      int err = GetLastError();
      // 4014 = URL not in whitelist, -1 = network error — log but don't crash
      if(err != 0 && err != 4014)
         Print("WebRequest error code: ", err, "  HTTP: ", res);
      else if(err == 4014)
         Print("WARNING: URL not in WebRequest whitelist — add ", ServerURL,
               " via Tools > Options > Expert Advisors");
     }
  }

//+------------------------------------------------------------------+
void ProcessCommand(string json_command)
  {
   if(StringFind(json_command, "download_ticks") >= 0)
     {
      string symbol    = ExtractJSONValue(json_command, "symbol");
      if(symbol == "") symbol = _Symbol;
      string start_str = ExtractJSONValue(json_command, "start");
      string stop_str  = ExtractJSONValue(json_command, "stop");
      datetime start_time, stop_time;
      if(start_str != "" && stop_str != "")
        { start_time = StringToTime(start_str); stop_time = StringToTime(stop_str); }
      else
        { stop_time = TimeCurrent(); start_time = stop_time - 30*24*3600; }
      Print("Executing: Download Ticks for ", symbol, " from ", start_time, " to ", stop_time);
      DownloadTicks(symbol, start_time, stop_time);
     }
   else if(StringFind(json_command, "download_ohlcv") >= 0)
     {
      string symbol    = ExtractJSONValue(json_command, "symbol");
      if(symbol == "") symbol = _Symbol;
      string start_str = ExtractJSONValue(json_command, "start");
      string stop_str  = ExtractJSONValue(json_command, "stop");
      datetime start_time = D'2021.01.01 00:00:00';
      datetime stop_time  = D'2025.12.31 23:59:59';
      if(start_str != "" && stop_str != "")
        { start_time = StringToTime(start_str); stop_time = StringToTime(stop_str); }
      Print("Executing: Download OHLCV 1m for ", symbol);
      DownloadOHLCV(symbol, PERIOD_M1, start_time, stop_time);
     }
   else if(StringFind(json_command, "ping") >= 0)
     {
      SendDataToServer("{\"type\":\"pong\",\"message\":\"MT5 is alive!\"}");
     }
  }

//+------------------------------------------------------------------+
string ExtractJSONValue(string json, string key)
  {
   string k1 = "\"" + key + "\":\"";
   string k2 = "\"" + key + "\": \"";
   int pos = StringFind(json, k1);
   int off = StringLen(k1);
   if(pos < 0) { pos = StringFind(json, k2); off = StringLen(k2); }
   if(pos < 0) return "";
   pos += off;
   int end = StringFind(json, "\"", pos);
   if(end < 0) return "";
   return StringSubstr(json, pos, end - pos);
  }

//+------------------------------------------------------------------+
void SendDataToServer(string json_payload)
  {
   char   post[], result[];
   string reqHeaders = "Content-Type: application/json\r\n";  // INPUT headers
   string resHeaders;                                          // OUTPUT headers (separate!)

   StringToCharArray(json_payload, post);
   ResetLastError();
   int res = WebRequest("POST", ServerURL + "/", reqHeaders,
                        RequestTimeoutMs, post, result, resHeaders);
   if(res != 200)
      Print("SendData failed. HTTP: ", res, " err: ", GetLastError(),
            " payload_len: ", StringLen(json_payload));
  }

//+------------------------------------------------------------------+
void DownloadTicks(string sym, datetime start_time, datetime stop_time)
  {
   MqlTick ticks[];
   datetime current_start = start_time;
   int total_sent = 0, day_num = 0;
   int total_days = (int)((stop_time - start_time) / 86400) + 1;

   while(current_start < stop_time)
     {
      datetime current_end = current_start + 86400;
      if(current_end > stop_time) current_end = stop_time;
      day_num++;

      int copied = CopyTicks(sym, ticks, COPY_TICKS_ALL,
                             (ulong)(current_start)*1000, MaxTicksPerRequest);
      if(copied <= 0) { current_start = current_end; continue; }

      int valid_count = 0;
      for(int i = 0; i < copied; i++)
        {
         datetime t = (datetime)(ticks[i].time_msc / 1000);
         if(t >= current_start && t < current_end) valid_count++;
        }
      if(valid_count == 0) { current_start = current_end; continue; }

      Print("Day ", day_num, "/", total_days, ": ", valid_count, " ticks for ", sym);

      int totalChunks = (valid_count / MaxBarsPerChunk) + 1;
      string jsonArr  = "[";
      int inChunk = 0, chunkNum = 0, tickIdx = 0;

      for(int i = 0; i < copied; i++)
        {
         datetime t = (datetime)(ticks[i].time_msc / 1000);
         if(t < current_start || t >= current_end) continue;

         int side = 0;
         if(ticks[i].last >= ticks[i].ask)       side =  1;
         else if(ticks[i].last <= ticks[i].bid)  side = -1;

         if(inChunk > 0) jsonArr += ",";
         string ts  = TimeToString((datetime)(ticks[i].time_msc/1000), TIME_DATE|TIME_SECONDS);
         int    ms  = (int)(ticks[i].time_msc % 1000);
         jsonArr += StringFormat(
           "{\"time\":\"%s.%03d\",\"last\":%.2f,\"volume\":%d,\"value_thb\":%.2f,\"side\":%d,\"bid\":%.2f,\"ask\":%.2f}",
           ts, ms, ticks[i].last, (int)ticks[i].volume,
           ticks[i].last * ticks[i].volume, side, ticks[i].bid, ticks[i].ask);
         inChunk++; tickIdx++;

         if(inChunk >= MaxBarsPerChunk || tickIdx == valid_count)
           {
            jsonArr += "]"; chunkNum++;
            string payload = StringFormat(
              "{\"type\":\"tick_chunk\",\"symbol\":\"%s\",\"chunk_index\":%d,\"total_chunks\":%d,\"day\":\"%s\",\"data\":%s}",
              sym, chunkNum, totalChunks, TimeToString(current_start, TIME_DATE), jsonArr);
            SendDataToServer(payload);
            jsonArr = "["; inChunk = 0;
           }
        }
      if(inChunk > 0)
        {
         jsonArr += "]"; chunkNum++;
         string payload = StringFormat(
           "{\"type\":\"tick_chunk\",\"symbol\":\"%s\",\"chunk_index\":%d,\"total_chunks\":%d,\"day\":\"%s\",\"data\":%s}",
           sym, chunkNum, totalChunks, TimeToString(current_start, TIME_DATE), jsonArr);
         SendDataToServer(payload);
        }
      total_sent += valid_count;
      current_start = current_end;
      Sleep(100);
     }
   string done = StringFormat("{\"type\":\"tick_complete\",\"symbol\":\"%s\",\"total_ticks\":%d}", sym, total_sent);
   SendDataToServer(done);
   Print("✅ Done! Total ticks sent: ", total_sent, " for ", sym);
  }

//+------------------------------------------------------------------+
void DownloadOHLCV(string sym, ENUM_TIMEFRAMES tf,
                   datetime start_time, datetime stop_time)
  {
   MqlRates rates[];
   ArraySetAsSeries(rates, false);
   int copied = CopyRates(sym, tf, start_time, stop_time, rates);
   if(copied <= 0)
     {
      Print("Failed to copy rates for ", sym, " Err: ", GetLastError());
      SendDataToServer("{\"type\":\"error\",\"message\":\"No data for " + sym + "\"}");
      return;
     }
   Print("Copied ", copied, " bars for ", sym, ". Sending...");
   int totalChunks = (copied / MaxBarsPerChunk) + 1;
   for(int i = 0; i < totalChunks; i++)
     {
      int startIdx  = i * MaxBarsPerChunk;
      int chunkCount = MathMin(MaxBarsPerChunk, copied - startIdx);
      if(chunkCount <= 0) break;
      string jsonArr = "[";
      for(int j = 0; j < chunkCount; j++)
        {
         MqlRates r = rates[startIdx + j];
         jsonArr += StringFormat(
           "{\"time\":%d,\"open\":%.5f,\"high\":%.5f,\"low\":%.5f,\"close\":%.5f,\"tick_volume\":%d}",
           r.time, r.open, r.high, r.low, r.close, r.tick_volume);
         if(j < chunkCount - 1) jsonArr += ",";
        }
      jsonArr += "]";
      string payload = StringFormat(
        "{\"type\":\"ohlcv_chunk\",\"symbol\":\"%s\",\"chunk_index\":%d,\"total_chunks\":%d,\"data\":%s}",
        sym, i+1, totalChunks, jsonArr);
      SendDataToServer(payload);
     }
   Print("✅ OHLCV complete for ", sym);
  }
//+------------------------------------------------------------------+
