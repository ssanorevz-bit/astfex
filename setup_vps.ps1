# =============================================================
# setup_vps.ps1 — VPS Auto Setup (ไม่รวม MT5)
# =============================================================
# วิธีใช้ (PowerShell Administrator):
#   irm https://raw.githubusercontent.com/ssanorevz-bit/MT5-VPS/main/setup_vps.ps1 | iex
# =============================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VPS Setup — Quant Collector"              -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# [0] ตั้ง Timezone Bangkok + Sync เวลา
Write-Host "[0/5] ตั้ง Timezone + Sync เวลา ..." -ForegroundColor Yellow
Set-TimeZone -Id "SE Asia Standard Time"
w32tm /resync /force | Out-Null
Write-Host "[0/5] Timezone: $((Get-TimeZone).DisplayName)" -ForegroundColor Green
Write-Host "[0/5] เวลาปัจจุบัน: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green

# [1] สร้าง folder
New-Item -ItemType Directory -Force -Path C:\quant     | Out-Null
New-Item -ItemType Directory -Force -Path C:\quant-s\data | Out-Null
Write-Host "[1/5] folders OK" -ForegroundColor Green

# [2] ติดตั้ง Python 3.11
Write-Host "[2/5] ดาวน์โหลด + ติดตั้ง Python 3.11 ..." -ForegroundColor Yellow
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCheck) {
    Write-Host "[2/5] Python มีอยู่แล้ว: $($pythonCheck.Source)" -ForegroundColor Green
} else {
    Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -OutFile "$env:TEMP\py.exe" -UseBasicParsing
    Start-Process "$env:TEMP\py.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1" -Wait
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "[2/5] Python OK" -ForegroundColor Green
}

# [3] pip packages + download scripts
Write-Host "[3/5] ติดตั้ง packages + ดาวน์โหลด scripts ..." -ForegroundColor Yellow
python -m pip install MetaTrader5 pandas pyarrow -q
curl -o "C:\quant-s\collect_mt5_tick_dom.py" "https://raw.githubusercontent.com/ssanorevz-bit/MT5-VPS/main/collect_mt5_tick_dom.py"
curl -o "C:\quant-s\DOM_Collector.mq5" "https://raw.githubusercontent.com/ssanorevz-bit/MT5-VPS/main/DOM_Collector.mq5"
Write-Host "[3/5] packages + scripts OK" -ForegroundColor Green

# [4] ดาวน์โหลด MT5 Pi Securities
Write-Host "[4/5] ดาวน์โหลด MT5 Pi Securities ..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://download.mql5.com/cdn/web/21687/mt5/pisecurities5setup.exe" -OutFile "C:\quant\pisecurities5setup.exe" -UseBasicParsing
Write-Host "[4/5] MT5 installer OK -> C:\quant\pisecurities5setup.exe" -ForegroundColor Green

# [5] สร้าง run_collector.bat
Write-Host "[5/5] สร้าง run_collector.bat + Task Scheduler ..." -ForegroundColor Yellow

$batContent = "@echo off`r`nchcp 65001 > nul`r`ntitle MT5 Quant Collector`r`necho ============================================`r`necho   MT5 Quant Collector`r`necho   Pi Securities -- S50IF + DOM`r`necho ============================================`r`necho.`r`ncd /d C:\quant-s`r`n:waitloop`r`necho [%time%] Checking MT5...`r`npython -c `"import MetaTrader5 as mt5; exit(0 if mt5.initialize() else 1)`" 2>nul`r`nif errorlevel 1 (`r`n    echo MT5 not ready -- retrying in 10s...`r`n    timeout /t 10 /nobreak > nul`r`n    goto waitloop`r`n)`r`necho.`r`necho [%time%] MT5 OK -- Starting Collector...`r`necho ============================================`r`necho.`r`npython collect_mt5_tick_dom.py`r`necho.`r`necho Collector stopped. Press any key to exit.`r`npause"
[System.IO.File]::WriteAllText("C:\quant-s\run_collector.bat", $batContent, [System.Text.Encoding]::ASCII)
Write-Host "  run_collector.bat OK" -ForegroundColor Green

# MT5Collector — รันตอน boot
schtasks /delete /tn MT5Collector /f 2>$null
schtasks /create /tn MT5Collector /tr "python C:\quant-s\collect_mt5_tick_dom.py" /sc onstart /ru Administrator /rl HIGHEST /f | Out-Null
schtasks /run /tn MT5Collector | Out-Null
Write-Host "  MT5Collector task OK (background)" -ForegroundColor Green
Write-Host "[5/5] Task Scheduler OK" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup เสร็จ!" -ForegroundColor Green
Write-Host ""
Write-Host "  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. ติดตั้ง MT5       : C:\quant\pisecurities5setup.exe" -ForegroundColor White
Write-Host "  2. MT5 Login + OTP" -ForegroundColor White
Write-Host "  3. Compile EA      : MetaEditor -> เปิด C:\quant-s\DOM_Collector.mq5 -> F7" -ForegroundColor White
Write-Host "     Attach EA       : ลาก DOM_Collector จาก Navigator -> chart S50IF" -ForegroundColor Gray
Write-Host ""
Write-Host "  เช็ค collector : Get-ScheduledTask MT5Collector | Select State" -ForegroundColor White
Write-Host "  ดู log         : Get-Content C:\quant-s\collector.log -Tail 20 -Wait" -ForegroundColor White
Write-Host ""
Write-Host "  ดึงข้อมูลกลับ Mac (รันบน Mac Terminal):" -ForegroundColor Yellow
Write-Host "  scp -r Administrator@<VPS_IP>:`"C:/quant-s/data/`" ~/Developer/Quant-S/data/vps/" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
