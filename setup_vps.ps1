# =============================================================
# setup_vps.ps1 — Lightnode VPS Auto Setup (ไม่รวม MT5)
# =============================================================
# วิธีใช้ (PowerShell Administrator):
#   irm https://raw.githubusercontent.com/ssanorevz-bit/MT5-VPS/main/setup_vps.ps1 | iex
# =============================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VPS Setup — Quant Collector"              -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# [1] สร้าง folder
New-Item -ItemType Directory -Force -Path C:\quant | Out-Null
Write-Host "[1/5] folder C:\quant OK" -ForegroundColor Green

# [2] ติดตั้ง Python 3.11
Write-Host "[2/5] ดาวน์โหลด + ติดตั้ง Python 3.11 ..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -OutFile "$env:TEMP\py.exe" -UseBasicParsing
Start-Process "$env:TEMP\py.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1" -Wait
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Host "[2/5] Python OK" -ForegroundColor Green

# [3] pip packages + download script
Write-Host "[3/5] ติดตั้ง packages + ดาวน์โหลด script ..." -ForegroundColor Yellow
python -m pip install MetaTrader5 pandas pyarrow -q
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ssanorevz-bit/MT5-VPS/main/collect_mt5_tick_dom.py" -OutFile "C:\quant\collect_mt5_tick_dom.py" -UseBasicParsing
Write-Host "[3/5] packages + script OK" -ForegroundColor Green

# [4] สร้าง .bat + ใส่ Startup
Write-Host "[4/5] ตั้ง Startup ..." -ForegroundColor Yellow
"@echo off`ntimeout /t 10 /nobreak`ncd /d C:\quant`npython collect_mt5_tick_dom.py" | Out-File "C:\quant\run_collector.bat" -Encoding ascii
Copy-Item "C:\quant\run_collector.bat" "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\run_collector.bat" -Force
Write-Host "[4/5] Startup OK" -ForegroundColor Green

# [5] ดาวน์โหลด MT5 Pi Securities
Write-Host "[5/5] ดาวน์โหลด MT5 Pi Securities ..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://download.mql5.com/cdn/web/21687/mt5/pisecurities5setup.exe" -OutFile "C:\quant\pisecurities5setup.exe" -UseBasicParsing
Write-Host "[5/5] MT5 installer OK -> C:\quant\pisecurities5setup.exe" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup เสร็จ!" -ForegroundColor Green
Write-Host "  เปิดติดตั้ง MT5: C:\quant\pisecurities5setup.exe" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
