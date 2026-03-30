#!/usr/bin/env bash
# sync_from_windows.sh
# ─────────────────────────────────────────────────────────────────
# ดึงข้อมูล Parquet จาก Windows VPS → Mac
# VPS: C:\quant-s\data\{ticks,dom}\SYMBOL\YYYY-MM-DD.parquet
# Mac: ~/Developer/Quant-S/data/vps/YYYY-MM-DD/{ticks,dom}/
# ─────────────────────────────────────────────────────────────────

WIN_HOST="windows-vps"           # SSH alias → 38.54.33.10
WIN_DATA="C:/quant-s/data"       # Collector output dir บน VPS

MAC_BASE="$HOME/Developer/Quant-S/data/vps"
DATE_TAG=$(date '+%Y-%m-%d')
DEST="${MAC_BASE}/${DATE_TAG}"
LOG="$HOME/Developer/Quant-S/sync.log"
TS=$(date '+%Y-%m-%d %H:%M:%S')

# ── สร้าง destination folders ──────────────────────────────────────
mkdir -p "${DEST}/ticks" "${DEST}/dom"

echo "" >> "$LOG"
echo "[${TS}] === เริ่ม sync ${DATE_TAG} จาก 38.54.33.10 ===" >> "$LOG"

# ── Sync Parquet (recursive: ticks + dom ทุก symbol) ──────────────
# ใช้ scp -r ดึงทั้ง folder structure มาเลย
echo "[${TS}] Syncing ticks..." >> "$LOG"
scp -r -o StrictHostKeyChecking=no \
    "${WIN_HOST}:${WIN_DATA}/ticks/" \
    "${DEST}/" >> "$LOG" 2>&1
TICK_STATUS=$?

echo "[${TS}] Syncing dom..." >> "$LOG"
scp -r -o StrictHostKeyChecking=no \
    "${WIN_HOST}:${WIN_DATA}/dom/" \
    "${DEST}/" >> "$LOG" 2>&1
DOM_STATUS=$?

# ── สรุปผล ────────────────────────────────────────────────────────
TS2=$(date '+%Y-%m-%d %H:%M:%S')
TICK_COUNT=$(find "${DEST}/ticks" -name "*.parquet" 2>/dev/null | wc -l | tr -d ' ')
DOM_COUNT=$(find  "${DEST}/dom"   -name "*.parquet" 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${DEST}" 2>/dev/null | awk '{print $1}')

if [ $DOM_STATUS -eq 0 ] && [ $TICK_STATUS -eq 0 ]; then
    echo "[${TS2}] ✅ sync สำเร็จ | ticks=${TICK_COUNT} dom=${DOM_COUNT} size=${TOTAL_SIZE}" >> "$LOG"
    FINAL_STATUS=0
else
    echo "[${TS2}] ⚠️  tick_status=${TICK_STATUS} dom_status=${DOM_STATUS}" >> "$LOG"
    FINAL_STATUS=1
fi

# ── แสดงขนาดไฟล์แต่ละตัว ──────────────────────────────────────────
echo "[${TS2}] --- Top 10 ไฟล์ใหญ่สุด ---" >> "$LOG"
find "${DEST}" -name "*.parquet" -exec du -sh {} \; 2>/dev/null | sort -rh | head -10 >> "$LOG"
echo "[${TS2}] === จบ ===" >> "$LOG"

# แสดงผลบน terminal ด้วย
if [ $FINAL_STATUS -eq 0 ]; then
    echo "✅ sync สำเร็จ — ticks=${TICK_COUNT} dom=${DOM_COUNT} (${TOTAL_SIZE})"
    echo "   บันทึกที่: ${DEST}"
else
    echo "⚠️  sync มีปัญหา — ดู log: ${LOG}"
fi

exit $FINAL_STATUS
