# Mock Data Plan

## Purpose

Define the mock data required before AlphaTerminal starts backend implementation.

The mock layer must support the full EOD product surface:
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

## Mock Strategy

## Backend-served mocks

Mocks should be served by FastAPI endpoints, not hardcoded in the frontend.

Reason:
- frontend integration validates API contracts early
- mock-to-real migration becomes a data-source swap
- EOD aggregation jobs can be developed against deterministic fixtures

## Deterministic generation

Generated mock data should be deterministic by:
- symbol
- trade date
- scenario

Avoid unseeded randomness because it makes QA and screenshots unstable.

## Recommended Fixture Layout

```text
backend/
├── fixtures/
│   ├── reference/
│   │   ├── instruments.json
│   │   ├── sectors.json
│   │   ├── sector_memberships.json
│   │   └── trading_calendar.json
│   ├── eod/
│   │   ├── prices.json
│   │   ├── index_prices.json
│   │   ├── stock_metrics.json
│   │   ├── market_breadth.json
│   │   ├── sector_performance.json
│   │   └── dashboard_summary.json
│   ├── workspace/
│   │   ├── watchlists.json
│   │   └── saved_screens.json
│   ├── alerts/
│   │   ├── alert_rules.json
│   │   └── alert_events.json
│   ├── portfolio/
│   │   ├── accounts.json
│   │   ├── trades.json
│   │   ├── positions.json
│   │   └── closed_trades.json
│   ├── performance/
│   │   ├── equity_curve.json
│   │   ├── drawdown.json
│   │   └── attribution.json
│   └── journal/
│       ├── entries.json
│       └── review_queue.json
```

## Mock Universe

Minimum initial universe:
- 50 stock instruments
- 8 sectors
- 2 index instruments
- 1 default user
- 3 watchlists
- 20-40 portfolio trades
- 12 months of daily EOD prices

Required scenarios:
- broad up day
- broad down day
- narrow leadership day
- sector rotation day
- illiquid symbol edge case
- large winning trade
- large losing trade
- drawdown period

## Module Mock Requirements

## Dashboard

Required data fields:
- `trade_date`
- market headline cards
- breadth summary
- top movers
- alert event counts
- portfolio summary
- review queue count

API endpoints covered:
- `GET /api/v1/dashboard/eod-summary`
- `GET /api/v1/dashboard/top-movers`
- `GET /api/v1/dashboard/review-summary`

Database tables represented:
- `eod_market_summary`
- `eod_market_breadth`
- `eod_sector_performance`
- `alert_events`
- `portfolio_daily_equity`
- `journal_review_queue`

Relationships:
- rows align by `trade_date`
- user-specific blocks align by `user_id`

Aggregation jobs exercised:
- `build_dashboard_eod_summary`

Mock data source:
- `fixtures/eod/dashboard_summary.json`
- generated from other EOD fixtures after phase 1

Future real migration:
- replace fixture rows with computed rows from real EOD data.

## Market Overview

Required data fields:
- indices
- total volume
- total turnover
- top gainers
- top losers
- turnover leaders
- market status

API endpoints covered:
- `GET /api/v1/market/eod-overview`
- `GET /api/v1/market/top-movers`

Database tables represented:
- `eod_index_prices`
- `eod_market_summary`
- `eod_stock_metrics`

Relationships:
- all records share `trade_date`

Aggregation jobs exercised:
- `compute_eod_market_overview`

Mock data source:
- generated from `fixtures/eod/prices.json`
- static index fixture for headline cards

Future real migration:
- ingest provider index and stock EOD files into the same tables.

## Market Breadth

Required data fields:
- advancers
- decliners
- unchanged
- new highs
- new lows
- up volume
- down volume
- breadth history

API endpoints covered:
- `GET /api/v1/market/breadth`
- `GET /api/v1/market/breadth/history`

Database tables represented:
- `eod_market_breadth`
- `universe_memberships`
- `eod_stock_metrics`

Relationships:
- breadth is calculated by universe membership and `trade_date`

Aggregation jobs exercised:
- `compute_eod_breadth`

Mock data source:
- generated from seeded daily returns

Future real migration:
- recalculate from real `eod_stock_metrics`.

## Sector Analysis

Required data fields:
- sector performance
- advancer/decliner counts
- turnover
- leaders
- laggards

API endpoints covered:
- `GET /api/v1/sectors/eod-performance`
- `GET /api/v1/sectors/{sector_id}/eod-detail`

Database tables represented:
- `sectors`
- `sector_memberships`
- `eod_sector_performance`
- `eod_stock_metrics`

Relationships:
- sector attribution and sector performance both depend on effective-date membership

Aggregation jobs exercised:
- `compute_eod_sector_performance`

Mock data source:
- static sector map plus generated EOD stock metrics

Future real migration:
- provider sector mapping imported into `sector_memberships`.

## Stock Detail

Required data fields:
- profile
- daily OHLCV
- EOD metrics
- short-sales fields where available
- user context for watchlist, alerts, and positions

API endpoints covered:
- `GET /api/v1/stocks/{symbol}/profile`
- `GET /api/v1/stocks/{symbol}/eod-ohlcv`
- `GET /api/v1/stocks/{symbol}/eod-metrics`
- `GET /api/v1/stocks/{symbol}/context`

Database tables represented:
- `instruments`
- `eod_prices`
- `eod_stock_metrics`
- `short_sales_daily`
- `watchlist_items`
- `alert_rules`
- `positions`

Relationships:
- all records link through `instrument_id`

Aggregation jobs exercised:
- `compute_eod_stock_metrics`

Mock data source:
- seeded OHLCV generator
- optional short-sales fixture for selected symbols

Future real migration:
- EOD price and short-sales provider loaders populate same tables.

## Screener

Required data fields:
- sector
- latest close/change
- volume
- turnover
- liquidity score
- trend score
- volatility
- 52-week high/low distance

API endpoints covered:
- `GET /api/v1/screener/filters`
- `POST /api/v1/screener/query`

Database tables represented:
- `eod_screener_metrics`
- `eod_stock_metrics`
- `instruments`
- `sectors`
- `saved_screens`

Relationships:
- screener rows are one row per symbol per date

Aggregation jobs exercised:
- `compute_eod_screener_metrics`

Mock data source:
- generated from stock metric fixture

Future real migration:
- recompute projection from real EOD metrics.

## Watchlist

Required data fields:
- watchlist id/name
- symbols
- latest close/change
- alert count
- position exposure

API endpoints covered:
- `GET /api/v1/watchlists`
- `GET /api/v1/watchlists/{watchlist_id}/eod-metrics`
- watchlist CRUD endpoints

Database tables represented:
- `watchlists`
- `watchlist_items`
- `eod_stock_metrics`
- `alert_rules`
- `positions`

Relationships:
- `watchlist_items.instrument_id` joins latest metrics

Aggregation jobs exercised:
- optional `build_watchlist_eod_projection`

Mock data source:
- static user watchlist fixture

Future real migration:
- watchlist user data stays unchanged; EOD metric source becomes real.

## Alerts Center

Required data fields:
- rule definitions
- generated events
- trigger values
- thresholds
- severity
- acknowledgement status

API endpoints covered:
- `GET /api/v1/alerts`
- `POST /api/v1/alerts`
- `PATCH /api/v1/alerts/{alert_id}`
- `DELETE /api/v1/alerts/{alert_id}`
- `GET /api/v1/alerts/events`

Database tables represented:
- `alert_rules`
- `alert_events`
- `eod_stock_metrics`

Relationships:
- alert events reference the metric row that triggered them where possible

Aggregation jobs exercised:
- `evaluate_eod_alerts`

Mock data source:
- static alert rules plus generated trigger events

Future real migration:
- the evaluator runs after real EOD stock metrics are computed.

## Portfolio / Position Manager

Required data fields:
- accounts
- trade ledger
- open positions
- daily position marks
- closed trades
- realized and unrealized PnL

API endpoints covered:
- `GET /api/v1/portfolio/summary`
- `GET /api/v1/portfolio/positions`
- `GET /api/v1/portfolio/trades`
- `POST /api/v1/portfolio/trades`
- `GET /api/v1/portfolio/closed-trades`

Database tables represented:
- `portfolio_accounts`
- `trades`
- `positions`
- `position_daily_marks`
- `closed_trades`
- `eod_prices`

Relationships:
- trades build positions and closed trades
- positions are marked against `eod_prices`

Aggregation jobs exercised:
- `rebuild_positions_from_trades`
- `mark_positions_eod`
- `build_closed_trades`

Mock data source:
- static trade ledger and generated daily closes

Future real migration:
- broker import writes trade rows; EOD price source changes independently.

## Performance Analytics

Required data fields:
- equity curve
- drawdown
- summary stats
- setup attribution
- sector attribution
- symbol attribution

API endpoints covered:
- `GET /api/v1/performance/equity-curve`
- `GET /api/v1/performance/drawdown`
- `GET /api/v1/performance/summary`
- `GET /api/v1/performance/attribution/setup`
- `GET /api/v1/performance/attribution/sector`
- `GET /api/v1/performance/attribution/symbol`

Database tables represented:
- `portfolio_daily_equity`
- `performance_daily`
- `drawdown_periods`
- `closed_trades`
- `trade_setups`
- `performance_attribution`

Relationships:
- performance uses position marks and closed trades
- attribution joins closed trades to setup, sector, and symbol

Aggregation jobs exercised:
- `compute_equity_curve`
- `compute_drawdowns`
- `compute_performance_summary`
- `compute_performance_attribution`

Mock data source:
- generated from portfolio fixtures

Future real migration:
- real trades and real EOD marks feed the same jobs.

## Journal Review Queue

Required data fields:
- review id
- linked trade, alert, drawdown, or symbol
- reason
- priority
- status
- notes

API endpoints covered:
- `GET /api/v1/journal/review-queue`
- `PATCH /api/v1/journal/review-queue/{review_id}`

Database tables represented:
- `journal_entries`
- `journal_review_queue`
- `closed_trades`
- `alert_events`
- `drawdown_periods`

Relationships:
- queue items reference the source object that created the review need

Aggregation jobs exercised:
- `build_journal_review_queue`

Mock data source:
- generated from alert, drawdown, and closed trade fixtures

Future real migration:
- review rules run against real performance and alert outputs.

## Mock Acceptance Criteria

The mock phase is ready when:
- every canonical EOD endpoint returns deterministic data
- every module has at least one populated normal state
- edge states exist for empty watchlist, no alerts, no trades, and missing short-sales data
- dashboard, performance, and journal values can be traced back to fixture inputs
- replacing fixtures with real EOD tables does not change response field names
