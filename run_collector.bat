@echo off
chcp 65001 > nul
title MT5 Quant Collector — S50IF Data

echo ============================================
echo   MT5 Quant Collector
echo   Pi Securities — S50IF + DOM
echo ============================================
echo.

cd /d C:\quant-s

:waitloop
echo [%time%] Checking MT5...
python -c "import MetaTrader5 as mt5; mt5.initialize() and print('MT5 OK') or print('MT5 NOT READY')" 2>nul
if errorlevel 1 (
    echo MT5 not ready — retrying in 10s...
    timeout /t 10 /nobreak > nul
    goto waitloop
)

echo.
echo [%time%] Starting Collector...
echo ============================================
echo.

python collect_mt5_tick_dom.py

echo.
echo ============================================
echo   Collector stopped. Press any key to exit.
echo ============================================
pause
