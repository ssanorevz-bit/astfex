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
$pythonCheck = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCheck) {
    Write-Host "[2/5] Python มีอยู่แล้ว: $($pythonCheck.Source)" -ForegroundColor Green
} else {
    Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" -OutFile "$env:TEMP\py.exe" -UseBasicParsing
    Start-Process "$env:TEMP\py.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1" -Wait
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "[2/5] Python OK" -ForegroundColor Green
}

# [3] pip packages + download script
Write-Host "[3/5] ติดตั้ง packages + ดาวน์โหลด script ..." -ForegroundColor Yellow
python -m pip install MetaTrader5 pandas pyarrow -q
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ssanorevz-bit/MT5-VPS/main/collect_mt5_tick_dom.py" -OutFile "C:\quant\collect_mt5_tick_dom.py" -UseBasicParsing
Write-Host "[3/5] packages + script OK" -ForegroundColor Green

# [4] ดาวน์โหลด MT5 Pi Securities
Write-Host "[4/5] ดาวน์โหลด MT5 Pi Securities ..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://download.mql5.com/cdn/web/21687/mt5/pisecurities5setup.exe" -OutFile "C:\quant\pisecurities5setup.exe" -UseBasicParsing
Write-Host "[4/5] MT5 installer OK -> C:\quant\pisecurities5setup.exe" -ForegroundColor Green

# [5] ตั้ง Task Scheduler — รันใน background ไม่ขึ้นกับ RDP session
Write-Host "[5/5] ตั้ง Task Scheduler (background service) ..." -ForegroundColor Yellow
# ใช้ schtasks.exe (ทำงานได้ทุก Windows Server version)
schtasks /delete /tn MT5Collector /f 2>$null
schtasks /create /tn MT5Collector /tr "python C:\quant\collect_mt5_tick_dom.py" /sc onstart /ru SYSTEM /rl HIGHEST /f | Out-Null
schtasks /run /tn MT5Collector | Out-Null
Write-Host "[5/5] Task Scheduler OK — MT5Collector รันใน background แล้ว!" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup เสร็จ!" -ForegroundColor Green
Write-Host "  ติดตั้ง MT5: C:\quant\pisecurities5setup.exe" -ForegroundColor White
Write-Host "  เช็ค: Get-ScheduledTask MT5Collector | Select State" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
