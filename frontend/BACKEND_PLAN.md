# Backend Plan

## Purpose

Prepare AlphaTerminal for an EOD-first backend implementation phase.

This document is intentionally architecture-only. Do not treat it as permission to add backend code or change frontend UI.

## Repository Read Summary

Requested source docs:
- `DEVELOPMENT_ROADMAP.md` exists under `frontend/`
- `BACKEND_PLAN.md`, `API_CONTRACT.md`, `DATABASE_SCHEMA.md`, and `MOCK_DATA_PLAN.md` exist under `frontend/`
- `PROJECT_CONTEXT.md`, `DESIGN_SYSTEM.md`, `UI_COMPONENTS.md`, and `DATA_ARCHITECTURE.md` were not present in the current `main` checkout

Current code observed in `frontend/src`:
- React + TypeScript + Vite single page app
- current API calls still target `http://127.0.0.1:8000/api`
- visible code paths fetch OHLCV, short-sales enriched daily candles, symbols, watchlist rows, and morning brief data
- local watchlist layouts are persisted in `localStorage`

Product source of truth from latest frontend direction:
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

The backend plan below treats the completed module list above as the product target, while preserving compatibility with the current frontend API shapes.

## Backend Direction

- Python
- FastAPI
- PostgreSQL
- Redis only if later profiling shows it is needed
- Mock API first
- EOD data first
- Real-time tick, quote, websocket, and DOM systems later as placeholders only

## EOD-First Principles

## 1. Daily data is the first source of truth

The first backend should support:
- daily OHLCV
- EOD stock metrics
- EOD market breadth
- EOD sector performance
- EOD watchlist metrics
- EOD alert evaluation
- daily portfolio marks
- daily performance analytics

Intraday and realtime transports should not shape the first schema.

## 2. Frontend contract stability comes before provider integration

Mock API responses should match the future real API shape. Provider-specific details should be hidden behind ingestion and normalization jobs.

## 3. Derived analytics are stored with provenance

Every EOD aggregate should carry:
- `trade_date`
- `as_of`
- `source`
- `job_run_id`
- `is_mock`

This protects the frontend from stale or partial metrics.

## 4. Portfolio analytics are first-class

The backend must model:
- open positions
- closed trades
- equity curve
- drawdown
- setup attribution
- sector attribution
- symbol attribution
- journal review queue

These are product modules, not side calculations.

## Proposed Backend Modules

## `reference`

Owns:
- instruments
- sectors
- trading calendar
- asset-class metadata

## `eod_market_data`

Owns:
- daily OHLCV
- daily market snapshots
- stock detail metrics
- screener metrics
- watchlist metric projections

## `market_analytics`

Owns:
- market overview
- market breadth
- sector performance
- dashboard aggregate blocks

## `screener`

Owns:
- filter metadata
- screener queries
- saved screens later

## `workspace`

Owns:
- watchlists
- active layout state
- user preferences

## `alerts`

Owns:
- EOD alert rules
- generated alert events
- alert review state

## `portfolio`

Owns:
- accounts
- trades
- open positions
- closed trades
- daily marks

## `performance`

Owns:
- equity curve
- drawdown
- attribution
- setup statistics
- journal review queue

## Runtime Shape

## API layer

- FastAPI app
- route namespace: `/api/v1`
- Pydantic schemas for every response
- legacy compatibility routes under `/api` during frontend migration

## Database layer

- PostgreSQL
- no Redis requirement for phase 1
- use materialized or summary tables for heavy EOD dashboard queries

## Job layer

EOD jobs should be explicit, replayable, and auditable:
- load trading calendar
- load instrument master
- ingest daily OHLCV
- compute market snapshots
- compute breadth
- compute sector performance
- compute stock metrics
- compute screener metrics
- evaluate alerts
- mark positions
- close trade lifecycle updates
- compute performance analytics
- populate review queue

## Module Matrix

## Dashboard

Required data fields:
- `trade_date`
- index/market headline metrics
- market breadth summary
- top gainers, losers, turnover leaders
- triggered alert counts
- portfolio equity, PnL, drawdown
- review queue count

API endpoints:
- `GET /api/v1/dashboard/eod-summary`
- `GET /api/v1/dashboard/top-movers`
- `GET /api/v1/dashboard/review-summary`

Database tables:
- `eod_market_summary`
- `eod_market_breadth`
- `eod_sector_performance`
- `eod_stock_metrics`
- `alert_events`
- `portfolio_daily_equity`
- `journal_review_queue`

Relationships:
- joins by `trade_date`
- alert and portfolio rows are user-scoped

Aggregation jobs:
- `build_dashboard_eod_summary`

Mock data source:
- `mock/eod/dashboard_summary.json`

Future real migration path:
- replace mock market summary with provider-normalized EOD tables; keep response shape unchanged

## Market Overview

Required data fields:
- `trade_date`
- market status
- index level, change, change percent
- total turnover
- total volume
- advancing/declining/unchanged counts
- top movers

API endpoints:
- `GET /api/v1/market/eod-overview`
- `GET /api/v1/market/top-movers`

Database tables:
- `eod_index_prices`
- `eod_market_summary`
- `eod_stock_metrics`

Relationships:
- `eod_index_prices.trade_date` to `eod_market_summary.trade_date`

Aggregation jobs:
- `compute_eod_market_overview`

Mock data source:
- generated from mock daily OHLCV plus static index fixtures

Future real migration path:
- ingest exchange index EOD files or provider index closes into `eod_index_prices`

## Market Breadth

Required data fields:
- `trade_date`
- `universe_code`
- advancers
- decliners
- unchanged
- new highs
- new lows
- up volume
- down volume
- advance/decline ratio

API endpoints:
- `GET /api/v1/market/breadth`
- `GET /api/v1/market/breadth/history`

Database tables:
- `eod_market_breadth`
- `eod_stock_metrics`
- `universe_memberships`

Relationships:
- breadth is computed from `eod_stock_metrics` filtered by `universe_memberships`

Aggregation jobs:
- `compute_eod_breadth`

Mock data source:
- generated from mock daily OHLCV universe

Future real migration path:
- compute from normalized EOD stock metrics after daily ingest completes

## Sector Analysis

Required data fields:
- `trade_date`
- sector id/name
- equal-weight return
- cap-weight return
- turnover
- volume
- advancers/decliners
- leading symbols
- lagging symbols

API endpoints:
- `GET /api/v1/sectors/eod-performance`
- `GET /api/v1/sectors/{sector_id}/eod-detail`

Database tables:
- `sectors`
- `sector_memberships`
- `eod_sector_performance`
- `eod_stock_metrics`

Relationships:
- `sector_memberships.instrument_id` to `eod_stock_metrics.instrument_id`
- effective-date sector membership must be respected

Aggregation jobs:
- `compute_eod_sector_performance`

Mock data source:
- static sector map plus generated stock metrics

Future real migration path:
- import provider or exchange sector classifications into `sector_memberships`

## Stock Detail

Required data fields:
- instrument profile
- daily OHLCV history
- latest EOD metrics
- 52-week high/low
- average volume
- volatility
- gap metrics
- short-sales fields when available
- current watchlist/alert/position state

API endpoints:
- `GET /api/v1/stocks/{symbol}/profile`
- `GET /api/v1/stocks/{symbol}/eod-ohlcv`
- `GET /api/v1/stocks/{symbol}/eod-metrics`
- `GET /api/v1/stocks/{symbol}/context`

Database tables:
- `instruments`
- `eod_prices`
- `eod_stock_metrics`
- `short_sales_daily`
- `watchlist_items`
- `alert_rules`
- `positions`

Relationships:
- all stock detail data hangs from `instruments.id`

Aggregation jobs:
- `compute_eod_stock_metrics`

Mock data source:
- seeded OHLCV generator plus instrument fixtures

Future real migration path:
- real daily OHLCV and short-sales data replace mock rows in the same tables

## Screener

Required data fields:
- symbol
- name
- sector
- last close
- change percent
- volume
- turnover
- market cap
- 20/50/200 day trend metrics
- volatility
- 52-week distance
- liquidity flags
- user-selected filter state

API endpoints:
- `GET /api/v1/screener/filters`
- `POST /api/v1/screener/query`
- `GET /api/v1/screener/saved`
- `POST /api/v1/screener/saved`

Database tables:
- `eod_screener_metrics`
- `eod_stock_metrics`
- `instruments`
- `sectors`
- `saved_screens`

Relationships:
- screener metrics are one row per `instrument_id` and `trade_date`

Aggregation jobs:
- `compute_eod_screener_metrics`

Mock data source:
- generated from mock OHLCV and stock metrics

Future real migration path:
- recompute screener metrics from normalized EOD rows after provider ingest

## Watchlist

Required data fields:
- watchlist id/name
- symbols
- latest EOD close
- change
- change percent
- volume
- turnover
- sector
- alert state
- position state

API endpoints:
- `GET /api/v1/watchlists`
- `POST /api/v1/watchlists`
- `PATCH /api/v1/watchlists/{watchlist_id}`
- `DELETE /api/v1/watchlists/{watchlist_id}`
- `PUT /api/v1/watchlists/{watchlist_id}/items`
- `GET /api/v1/watchlists/{watchlist_id}/eod-metrics`

Database tables:
- `watchlists`
- `watchlist_items`
- `eod_stock_metrics`
- `alert_rules`
- `positions`

Relationships:
- `watchlist_items.instrument_id` to latest `eod_stock_metrics.instrument_id`

Aggregation jobs:
- no separate mandatory job; read latest EOD metrics
- optional `build_watchlist_eod_projection` if query load grows

Mock data source:
- user fixture watchlists plus generated stock metrics

Future real migration path:
- keep user tables unchanged; only replace metric source with real EOD rows

## Alerts Center

Required data fields:
- alert id
- symbol
- condition type
- threshold/config
- status
- generated event date
- event value
- severity
- acknowledgement state

API endpoints:
- `GET /api/v1/alerts`
- `POST /api/v1/alerts`
- `PATCH /api/v1/alerts/{alert_id}`
- `DELETE /api/v1/alerts/{alert_id}`
- `GET /api/v1/alerts/events`

Database tables:
- `alert_rules`
- `alert_events`
- `eod_stock_metrics`
- `portfolio_positions`

Relationships:
- alerts are user-scoped
- alert events point to the EOD metric row that triggered them

Aggregation jobs:
- `evaluate_eod_alerts`

Mock data source:
- static alert rules evaluated against generated EOD metrics

Future real migration path:
- run the same evaluator after real EOD metric jobs finish

## Portfolio / Position Manager

Required data fields:
- account id/name
- open positions
- quantity
- average cost
- latest close
- market value
- unrealized PnL
- realized PnL
- closed trades
- fees
- setup tags

API endpoints:
- `GET /api/v1/portfolio/summary`
- `GET /api/v1/portfolio/positions`
- `GET /api/v1/portfolio/trades`
- `POST /api/v1/portfolio/trades`
- `GET /api/v1/portfolio/closed-trades`

Database tables:
- `portfolio_accounts`
- `trades`
- `positions`
- `closed_trades`
- `position_daily_marks`
- `eod_prices`

Relationships:
- trades roll up into positions and closed trades
- daily marks join latest close by `instrument_id` and `trade_date`

Aggregation jobs:
- `rebuild_positions_from_trades`
- `mark_positions_eod`
- `build_closed_trades`

Mock data source:
- static trade ledger plus generated EOD closes

Future real migration path:
- broker imports can populate `trades`; EOD price source changes independently

## Performance Analytics

Required data fields:
- daily equity
- net deposits/withdrawals
- daily PnL
- cumulative return
- drawdown
- max drawdown
- closed trade stats
- setup attribution
- sector attribution
- symbol attribution
- journal review queue

API endpoints:
- `GET /api/v1/performance/equity-curve`
- `GET /api/v1/performance/drawdown`
- `GET /api/v1/performance/summary`
- `GET /api/v1/performance/attribution/setup`
- `GET /api/v1/performance/attribution/sector`
- `GET /api/v1/performance/attribution/symbol`
- `GET /api/v1/journal/review-queue`
- `PATCH /api/v1/journal/review-queue/{review_id}`

Database tables:
- `portfolio_daily_equity`
- `performance_daily`
- `drawdown_periods`
- `closed_trades`
- `trade_setups`
- `performance_attribution`
- `journal_entries`
- `journal_review_queue`

Relationships:
- performance rolls up from `position_daily_marks` and `closed_trades`
- attribution joins `closed_trades` to instruments, sectors, and setup tags
- review queue references trades, symbols, alerts, or drawdown periods

Aggregation jobs:
- `compute_equity_curve`
- `compute_drawdowns`
- `compute_performance_summary`
- `compute_performance_attribution`
- `build_journal_review_queue`

Mock data source:
- static trades, setup tags, and generated EOD price path

Future real migration path:
- broker trade import and real EOD prices feed the same performance jobs

## Future Placeholders

Do not design these in detail for the EOD implementation phase:
- realtime quotes
- websocket streams
- tick store
- quote store
- DOM snapshots
- order flow dashboard

Reserve only:
- `asset_class` fields in `instruments`
- `data_source` metadata
- API namespace placeholders under `/api/v1/future/*` if needed later

## Implementation Readiness Checklist

- Finalize `API_CONTRACT.md`
- Finalize `DATABASE_SCHEMA.md`
- Finalize `MOCK_DATA_PLAN.md`
- Finalize `EOD_DATA_PLAN.md`
- Scaffold backend only after these docs are accepted
- Build mock APIs first
- Add PostgreSQL migrations second
- Add EOD aggregation jobs third
- Add real data provider migration after mock flows are stable
