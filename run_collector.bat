@echo off
chcp 65001 > nul
title MT5 Quant Collector

echo ============================================
echo   MT5 Quant Collector
echo   Pi Securities -- S50IF + DOM
echo ============================================
echo.

cd /d C:\quant-s

:waitloop
echo [%time%] Checking MT5...
python -c "import MetaTrader5 as mt5; exit(0 if mt5.initialize() else 1)" 2>nul
if errorlevel 1 (
    echo MT5 not ready -- retrying in 10s...
    timeout /t 10 /nobreak > nul
    goto waitloop
)

echo.
echo [%time%] MT5 OK -- Starting Collector...
echo ============================================
echo.

python collect_mt5_tick_dom.py

echo.
echo Collector stopped. Press any key to exit.
pause
