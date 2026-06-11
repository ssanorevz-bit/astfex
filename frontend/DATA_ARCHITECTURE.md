# Data Architecture

## Purpose

This file provides a stable frontend-local data architecture reference for AlphaTerminal planning.

Repository search note:
- no existing `DATA_ARCHITECTURE.md` was found elsewhere in the repository
- this document is synthesized from current frontend source, existing docs, and the EOD backend plan

## Current Data Flow In Code

Current API helpers live in `frontend/src/utils/api.ts`.

Current legacy endpoints:
- `GET /api/ohlcv/{symbol}`
- `GET /api/short_sales/{symbol}`
- `GET /api/symbols`
- `GET /api/watchlist`
- `GET /api/morning_brief`

Current frontend data shapes:
- OHLCV candles
- short-sales enriched daily candles
- watchlist summary rows
- symbol list
- morning brief analytics blocks

## EOD-First Target Architecture

The first backend implementation should prioritize EOD data:
- daily OHLCV
- EOD stock metrics
- market breadth
- sector performance
- screener projections
- watchlist metrics
- EOD alert events
- portfolio marks
- performance analytics

## Canonical Storage Direction

Primary database:
- PostgreSQL

Cache:
- Redis only later if query profiling requires it

Primary tables are documented in `DATABASE_SCHEMA.md`.

Core EOD tables:
- `eod_prices`
- `eod_index_prices`
- `eod_stock_metrics`
- `eod_screener_metrics`
- `eod_market_summary`
- `eod_market_breadth`
- `eod_sector_performance`

Portfolio and performance tables:
- `portfolio_accounts`
- `trades`
- `positions`
- `position_daily_marks`
- `closed_trades`
- `portfolio_daily_equity`
- `performance_daily`
- `drawdown_periods`
- `performance_attribution`

Journal tables:
- `journal_entries`
- `journal_review_queue`

## EOD Job Order

Canonical job order is documented in `EOD_DATA_PLAN.md`.

High-level sequence:
- load reference data
- ingest daily OHLCV
- validate EOD prices
- compute stock metrics
- compute market overview, breadth, and sectors
- compute screener metrics
- evaluate EOD alerts
- rebuild and mark portfolio positions
- compute closed trades
- compute equity curve, drawdown, and attribution
- build journal review queue
- build dashboard summary

## Frontend API Direction

Canonical new routes should live under:
- `/api/v1`

Legacy compatibility routes should remain available while frontend code still calls:
- `/api/ohlcv/{symbol}`
- `/api/short_sales/{symbol}`
- `/api/symbols`
- `/api/watchlist`
- `/api/morning_brief`

## Future Data

Do not design these for the first EOD implementation phase:
- realtime quotes
- websocket streams
- tick data
- quote data
- level 2 DOM
- order flow

Reserve future compatibility through:
- `instruments.asset_class`
- source metadata
- provider manifests
- clear route namespaces
