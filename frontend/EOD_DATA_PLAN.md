# EOD Data Plan

## Purpose

Define the EOD data architecture for the first AlphaTerminal backend implementation phase.

This plan excludes realtime tick, quote, websocket, and DOM work except as future placeholders.

## EOD Scope

Phase 1 EOD backend must support:
- daily OHLCV
- market overview
- market breadth
- sector performance
- stock detail metrics
- screener metrics
- watchlist metrics
- EOD-generated alerts
- portfolio positions
- closed trades
- performance analytics
- equity curve
- drawdown
- setup attribution
- sector attribution
- symbol attribution
- journal review queue

## Data Domains

## 1. Reference Data

Required fields:
- instruments: symbol, name, exchange, asset class, currency, sector, active status
- sectors: code, name, display order
- memberships: sector and universe membership with effective dates
- calendar: open/closed trading days

Tables:
- `instruments`
- `sectors`
- `sector_memberships`
- `universe_memberships`
- `trading_calendar`

Jobs:
- `load_reference_data`
- `validate_reference_data`

Mock source:
- static JSON fixtures

Real migration:
- exchange symbol list or provider reference files
- manual overrides for sector mapping if provider data is weak

## 2. Daily OHLCV

Required fields:
- symbol
- trade date
- open
- high
- low
- close
- volume
- turnover
- source

Tables:
- `eod_prices`
- `eod_index_prices`

Jobs:
- `ingest_eod_prices`
- `validate_eod_prices`
- `publish_latest_eod_date`

Validation checks:
- OHLC consistency: high >= open/close/low, low <= open/close/high
- duplicate symbol/date rows
- missing active symbols
- non-positive close
- suspicious zero volume

Mock source:
- deterministic OHLCV generator seeded by symbol and scenario

Real migration:
- provider EOD files first
- exchange official EOD files later if available
- retain raw files in `data_source_files`

## 3. Stock Detail Metrics

Required fields:
- change and change percent
- 5/20/60 day returns
- 20/50/200 day moving averages
- 20 day average volume
- 20 day volatility
- 52-week high and low
- distance from 52-week high and low
- liquidity score
- trend score
- short-sales metrics where available

Tables:
- `eod_stock_metrics`
- `short_sales_daily`

Jobs:
- `compute_eod_stock_metrics`
- `compute_short_sales_metrics`

Mock source:
- generated from mock prices
- static short-sales fixture for selected symbols

Real migration:
- compute from `eod_prices`
- load short-sales from dedicated EOD source

## 4. Market Overview

Required fields:
- trade date
- market status
- index levels
- market turnover
- market volume
- top gainers
- top losers
- turnover leaders

Tables:
- `eod_market_summary`
- `eod_index_prices`
- `eod_stock_metrics`

Jobs:
- `compute_eod_market_overview`

Mock source:
- generated from mock stock metrics and index fixture

Real migration:
- index EOD ingest plus computed market summary

## 5. Market Breadth

Required fields:
- universe code
- advancers
- decliners
- unchanged
- new highs
- new lows
- up volume
- down volume
- advance/decline ratio

Tables:
- `eod_market_breadth`
- `universe_memberships`
- `eod_stock_metrics`

Jobs:
- `compute_eod_breadth`

Mock source:
- generated from mock stock returns

Real migration:
- compute from normalized stock metrics after EOD price validation

## 6. Sector Performance

Required fields:
- sector id
- equal-weight return
- cap-weight return
- volume
- turnover
- advancers
- decliners
- leaders
- laggards

Tables:
- `eod_sector_performance`
- `sector_memberships`
- `eod_stock_metrics`

Jobs:
- `compute_eod_sector_performance`

Mock source:
- static sector mapping plus generated stock metrics

Real migration:
- provider sector mapping with manual corrections

## 7. Screener Metrics

Required fields:
- symbol
- sector
- close
- change percent
- volume
- turnover
- market cap
- liquidity score
- trend score
- volatility
- 52-week distances

Tables:
- `eod_screener_metrics`
- `saved_screens`

Jobs:
- `compute_eod_screener_metrics`

Mock source:
- projection generated from `eod_stock_metrics`

Real migration:
- same projection job reads real stock metrics

## 8. Watchlist Metrics

Required fields:
- watchlist symbols
- latest EOD stock metrics
- alert count
- position exposure

Tables:
- `watchlists`
- `watchlist_items`
- `eod_stock_metrics`
- `alert_rules`
- `positions`

Jobs:
- optional `build_watchlist_eod_projection`

Mock source:
- fixture watchlists joined with generated metrics

Real migration:
- user watchlist tables remain unchanged

## 9. EOD Alerts

Required fields:
- rule id
- symbol
- rule type
- condition config
- trigger value
- threshold value
- trade date
- severity
- status

Tables:
- `alert_rules`
- `alert_events`
- `eod_stock_metrics`

Jobs:
- `evaluate_eod_alerts`

Supported phase 1 alert types:
- close above/below
- percent change above/below
- volume multiple above average
- new 52-week high
- new 52-week low
- moving-average state from daily metrics

Mock source:
- static rules with generated events

Real migration:
- run after real stock metrics are computed

## 10. Portfolio Positions

Required fields:
- account
- symbol
- quantity
- average cost
- latest EOD close
- market value
- unrealized PnL
- realized PnL

Tables:
- `portfolio_accounts`
- `trades`
- `positions`
- `position_daily_marks`
- `eod_prices`

Jobs:
- `rebuild_positions_from_trades`
- `mark_positions_eod`

Mock source:
- static trade ledger plus generated EOD closes

Real migration:
- broker import can populate `trades`
- EOD price source changes independently

## 11. Closed Trades

Required fields:
- opened date
- closed date
- symbol
- quantity
- average entry
- average exit
- fees
- net PnL
- return percent
- holding days
- setup tag

Tables:
- `closed_trades`
- `trades`
- `trade_setups`

Jobs:
- `build_closed_trades`

Mock source:
- generated from mock trade ledger

Real migration:
- same lifecycle builder runs after broker or manual trade ingest

## 12. Performance Analytics

Required fields:
- daily equity
- daily PnL
- daily return
- cumulative return
- drawdown
- max drawdown
- realized PnL
- unrealized PnL

Tables:
- `portfolio_daily_equity`
- `performance_daily`
- `drawdown_periods`

Jobs:
- `compute_equity_curve`
- `compute_drawdowns`
- `compute_performance_summary`

Mock source:
- portfolio fixtures and generated position marks

Real migration:
- real trade ledger plus real EOD marks

## 13. Attribution

Required fields:
- attribution type: setup, sector, symbol
- attribution key
- trade count
- gross PnL
- net PnL
- win rate
- average return

Tables:
- `performance_attribution`
- `closed_trades`
- `trade_setups`
- `sector_memberships`
- `instruments`

Jobs:
- `compute_performance_attribution`

Mock source:
- closed trade fixtures with setup tags and sector memberships

Real migration:
- computed from real closed trades and effective-dated reference data

## 14. Journal Review Queue

Required fields:
- review id
- reason
- linked closed trade, alert, drawdown, or symbol
- priority
- status
- notes

Tables:
- `journal_entries`
- `journal_review_queue`
- `closed_trades`
- `alert_events`
- `drawdown_periods`

Jobs:
- `build_journal_review_queue`

Queue generation rules:
- large loss
- large win
- new drawdown trough
- alert follow-up
- repeated setup underperformance
- symbol concentration warning

Mock source:
- generated from closed trades, alerts, and drawdown fixtures

Real migration:
- same queue builder runs after performance and alerts jobs

## EOD Job Order

1. `load_reference_data`
2. `ingest_eod_prices`
3. `validate_eod_prices`
4. `compute_eod_stock_metrics`
5. `compute_eod_market_overview`
6. `compute_eod_breadth`
7. `compute_eod_sector_performance`
8. `compute_eod_screener_metrics`
9. `evaluate_eod_alerts`
10. `rebuild_positions_from_trades`
11. `mark_positions_eod`
12. `build_closed_trades`
13. `compute_equity_curve`
14. `compute_drawdowns`
15. `compute_performance_summary`
16. `compute_performance_attribution`
17. `build_journal_review_queue`
18. `build_dashboard_eod_summary`

## Data Quality Gates

Block downstream jobs when:
- active instrument master is empty
- trading calendar does not include the target date
- EOD price row count is below configured threshold
- duplicate symbol/date rows exist
- more than configured percent of active symbols have missing close
- market summary cannot be built

Warn but continue when:
- selected symbols lack short-sales data
- sector mapping is missing for a small number of symbols
- a portfolio symbol has no latest close
- a saved screen has unsupported legacy filters

## Mock-to-Real Migration Path

## Stage 1: Static fixtures

- serve fixture JSON through FastAPI routes
- no database required for the earliest API smoke test

## Stage 2: Mock database

- load fixtures into PostgreSQL
- run EOD aggregation jobs against mock rows
- compare outputs to expected fixture snapshots

## Stage 3: Real EOD ingest

- load raw provider files
- normalize into `eod_prices`
- run quality gates
- recompute all derived tables

## Stage 4: Provider hardening

- add source manifests
- add checksums
- add replay by `trade_date`
- add provider fallback logic

## Future Placeholders

Do not implement during EOD phase:
- intraday bars
- realtime quotes
- tick data
- level 2 DOM
- websocket streams

Future work can add those beside the EOD tables without changing the EOD API contract.
