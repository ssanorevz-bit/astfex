# =============================================================
# setup_ssh.ps1 — ติดตั้ง OpenSSH Server บน Windows VPS
# =============================================================
# วิธีใช้ (PowerShell Administrator):
#   irm https://raw.githubusercontent.com/ssanorevz-bit/astfex/main/setup_ssh.ps1 | iex
# =============================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ติดตั้ง OpenSSH Server บน VPS"            -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# [1] ติดตั้ง OpenSSH Server
Write-Host "[1/3] ติดตั้ง OpenSSH Server ..." -ForegroundColor Yellow
$installed = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
if ($installed.State -eq 'Installed') {
    Write-Host "      OpenSSH Server มีอยู่แล้ว" -ForegroundColor Green
} else {
    Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
    Write-Host "      OpenSSH Server ติดตั้งเสร็จ" -ForegroundColor Green
}

# [2] เปิดและตั้งให้รันอัตโนมัติ
Write-Host "[2/3] เปิด SSH Service + Auto Start ..." -ForegroundColor Yellow
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'
Write-Host "      SSH Service: Running" -ForegroundColor Green

# [3] เปิด Firewall Port 22
Write-Host "[3/3] เปิด Firewall Port 22 ..." -ForegroundColor Yellow
$rule = Get-NetFirewallRule -Name "sshd" -ErrorAction SilentlyContinue
if (-not $rule) {
    New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Port 22' `
        -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
}
Write-Host "      Firewall Port 22: Open" -ForegroundColor Green

# แสดง IP
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SSH Server พร้อมใช้งาน!" -ForegroundColor Green
Write-Host ""
Write-Host "  IP VPS: $ip" -ForegroundColor White
Write-Host ""
Write-Host "  ดึงข้อมูล DOM จาก Mac Terminal:" -ForegroundColor Yellow
Write-Host "  scp -r Administrator@$ip`:`"C:/Users/Administrator/AppData/Roaming/MetaQuotes/Terminal/*/MQL5/Files/dom/`" ~/Developer/Quant-S/data/vps_dom_raw/" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
