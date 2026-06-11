# Project Context

## Purpose

This file provides a stable frontend-local context document for AlphaTerminal planning.

Repository search note:
- no existing `PROJECT_CONTEXT.md` was found elsewhere in the repository
- this document is synthesized from the current `frontend/` source, existing frontend docs, and the latest product direction

## Product Source Of Truth

The frontend is the product source of truth. Backend planning should start from the frontend modules, visible workflows, and documented API expectations before introducing backend abstractions.

Current completed frontend modules from product direction:
- Dashboard
- Market Overview
- Market Breadth
- Sector Analysis
- Stock Detail
- Screener
- Watchlist
- Alerts Center
- Portfolio / Position Manager
- Performance Analytics

Current code observed in this checkout:
- Vite + React + TypeScript frontend under `frontend/src`
- chart workstation shell with watchlist, indicators, comparison controls, and institutional panel
- API assumptions currently target `http://127.0.0.1:8000/api`
- backend implementation is not present in `frontend/`

## Backend Planning Direction

Backend work should be prepared as:
- Python
- FastAPI
- PostgreSQL
- Redis only later if needed
- mock API first
- EOD data first
- realtime tick, quote, DOM, and websocket support later

## First Backend Implementation Goal

Prepare an EOD backend capable of supporting:
- daily OHLCV
- market breadth
- sector performance
- stock detail metrics
- screener metrics
- watchlist metrics
- EOD alert generation
- portfolio positions
- closed trades
- performance analytics
- equity curve
- drawdown
- setup, sector, and symbol attribution
- journal review queue

## Related Docs

- `BACKEND_PLAN.md`
- `API_CONTRACT.md`
- `DATABASE_SCHEMA.md`
- `MOCK_DATA_PLAN.md`
- `EOD_DATA_PLAN.md`
- `DEVELOPMENT_ROADMAP.md`
- `ARCHITECTURE.md`
