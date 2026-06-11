# API Contract

## Purpose

Define the EOD-first API contract for AlphaTerminal.

This contract prepares the backend for mock API implementation first, then real EOD data migration. It keeps current frontend compatibility in mind, but the canonical route namespace is `/api/v1`.

## Base Rules

- Base path: `/api/v1`
- Current legacy compatibility path: `/api`
- Response format: JSON
- Dates:
  - EOD resources use `trade_date` as `YYYY-MM-DD`
  - metadata timestamps use ISO 8601 UTC
  - chart bars may include Unix seconds for compatibility with the current chart frontend
- Data source:
  - every EOD response must include `source`, `as_of`, and `is_mock` metadata

## Shared Envelope

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "trade_date": "2026-06-10",
    "as_of": "2026-06-11T00:30:00Z",
    "source": "mock",
    "is_mock": true,
    "request_id": "01HX0000000000000000000000"
  }
}
```

## Shared Objects

## Instrument

```json
{
  "symbol": "DELTA",
  "name": "Delta Electronics Thailand",
  "exchange": "SET",
  "asset_class": "stock",
  "currency": "THB",
  "sector": "Electronics",
  "industry": "Electronic Components",
  "is_active": true
}
```

## Daily OHLCV Bar

```json
{
  "trade_date": "2026-06-10",
  "time": 1781049600,
  "open": 100.0,
  "high": 104.0,
  "low": 99.0,
  "close": 102.5,
  "volume": 1200000,
  "turnover": 123000000.0
}
```

## EOD Stock Metrics

```json
{
  "symbol": "DELTA",
  "trade_date": "2026-06-10",
  "close": 102.5,
  "change": 1.5,
  "change_pct": 1.49,
  "volume": 1200000,
  "turnover": 123000000.0,
  "avg_volume_20d": 950000,
  "return_5d_pct": 3.2,
  "return_20d_pct": 8.7,
  "distance_from_52w_high_pct": -6.4,
  "distance_from_52w_low_pct": 42.8,
  "volatility_20d": 0.024,
  "liquidity_score": 86.4,
  "trend_score": 72.1
}
```

## Legacy Compatibility Routes

These support the current code in `frontend/src/utils/api.ts`.

## `GET /api/ohlcv/{symbol}`

Query:
- `timeframe`
- `limit`
- `end_time`

For EOD phase, `timeframe=1D` is the canonical supported path. Other timeframes may return mock compatibility data until intraday is designed later.

## `GET /api/short_sales/{symbol}`

Returns daily OHLCV bars enriched with:
- `ssVol`
- `ssSi`
- `ssSma5`
- `ssSma10`

## `GET /api/symbols`

Returns:

```json
{
  "symbols": ["DELTA", "PTT", "AOT"]
}
```

## `GET /api/watchlist`

Returns:

```json
{
  "data": [
    {
      "symbol": "DELTA",
      "last": 102.5,
      "chg": 1.5,
      "chgPct": 1.49,
      "volume": 1200000
    }
  ]
}
```

## `GET /api/morning_brief`

Kept for the current institutional panel. EOD v1 may fulfill it from dashboard and breadth summary tables.

## Canonical EOD API

## Reference

### `GET /api/v1/reference/instruments`

Query:
- `asset_class`
- `sector`
- `active`

Returns instrument master rows.

### `GET /api/v1/reference/sectors`

Returns sector metadata and latest member counts.

### `GET /api/v1/reference/trading-calendar`

Query:
- `from`
- `to`

Returns trading days and market status.

## Dashboard

### `GET /api/v1/dashboard/eod-summary`

Required data fields:
- `trade_date`
- `market_status`
- `index_cards`
- `breadth`
- `top_movers`
- `portfolio_summary`
- `alerts_summary`
- `review_queue_count`

Database tables:
- `eod_market_summary`
- `eod_market_breadth`
- `eod_sector_performance`
- `eod_stock_metrics`
- `portfolio_daily_equity`
- `alert_events`
- `journal_review_queue`

Aggregation jobs:
- `build_dashboard_eod_summary`

Mock data source:
- `mock/eod/dashboard_summary.json`

Future migration:
- same response assembled from real EOD tables after provider ingest.

## Market Overview

### `GET /api/v1/market/eod-overview`

Required data fields:
- `trade_date`
- `indices`
- `total_turnover`
- `total_volume`
- `advancers`
- `decliners`
- `unchanged`
- `top_gainers`
- `top_losers`
- `turnover_leaders`

Database tables:
- `eod_index_prices`
- `eod_market_summary`
- `eod_stock_metrics`

Aggregation jobs:
- `compute_eod_market_overview`

Mock data source:
- generated index fixtures and generated stock EOD metrics

Future migration:
- normalized exchange/provider EOD index and stock files.

## Market Breadth

### `GET /api/v1/market/breadth`

Query:
- `trade_date`
- `universe`

Required data fields:
- `advancers`
- `decliners`
- `unchanged`
- `new_highs`
- `new_lows`
- `up_volume`
- `down_volume`
- `advance_decline_ratio`

Database tables:
- `eod_market_breadth`
- `universe_memberships`
- `eod_stock_metrics`

Relationships:
- breadth rows are scoped by `universe_code` and `trade_date`

Aggregation jobs:
- `compute_eod_breadth`

Mock data source:
- generated from seeded daily stock metrics

Future migration:
- recompute from real `eod_stock_metrics`.

### `GET /api/v1/market/breadth/history`

Returns a date series of breadth snapshots.

## Sector Analysis

### `GET /api/v1/sectors/eod-performance`

Required data fields:
- `sector_id`
- `sector_name`
- `equal_weight_return_pct`
- `cap_weight_return_pct`
- `turnover`
- `volume`
- `advancers`
- `decliners`
- `leaders`
- `laggards`

Database tables:
- `sectors`
- `sector_memberships`
- `eod_sector_performance`
- `eod_stock_metrics`

Relationships:
- sector performance is computed by effective membership on `trade_date`

Aggregation jobs:
- `compute_eod_sector_performance`

Mock data source:
- static sector map plus generated stock metrics

Future migration:
- real sector membership import and normalized stock EOD metrics.

### `GET /api/v1/sectors/{sector_id}/eod-detail`

Returns sector history and constituents for one sector.

## Stock Detail

### `GET /api/v1/stocks/{symbol}/profile`

Returns instrument and company metadata.

### `GET /api/v1/stocks/{symbol}/eod-ohlcv`

Query:
- `from`
- `to`
- `limit`

Returns daily OHLCV bars.

### `GET /api/v1/stocks/{symbol}/eod-metrics`

Required data fields:
- latest close/change
- volume/turnover
- 20/50/200 day returns
- moving averages
- volatility
- 52-week high/low distance
- liquidity score
- trend score
- short-sales fields if available

Database tables:
- `instruments`
- `eod_prices`
- `eod_stock_metrics`
- `short_sales_daily`

Aggregation jobs:
- `compute_eod_stock_metrics`

Mock data source:
- seeded OHLCV generator

Future migration:
- real EOD price and short-sales imports.

### `GET /api/v1/stocks/{symbol}/context`

Returns user-specific watchlist, alert, position, and journal state for the stock.

## Screener

### `GET /api/v1/screener/filters`

Returns available sectors, numeric ranges, and supported metric names.

### `POST /api/v1/screener/query`

Request:

```json
{
  "trade_date": "2026-06-10",
  "filters": {
    "sector": ["Electronics"],
    "min_turnover": 10000000,
    "min_liquidity_score": 70
  },
  "sort": {
    "field": "return_20d_pct",
    "direction": "desc"
  },
  "page": 1,
  "page_size": 50
}
```

Required response row fields:
- instrument fields
- latest price fields
- liquidity metrics
- trend metrics
- volatility metrics
- sector fields

Database tables:
- `eod_screener_metrics`
- `eod_stock_metrics`
- `instruments`
- `sectors`
- `saved_screens`

Aggregation jobs:
- `compute_eod_screener_metrics`

Mock data source:
- generated screener rows from mock stock metrics

Future migration:
- recompute from real EOD rows.

## Watchlist

### `GET /api/v1/watchlists`

Returns user watchlists and symbols.

### `POST /api/v1/watchlists`

Creates a watchlist.

### `PATCH /api/v1/watchlists/{watchlist_id}`

Renames or reorders a watchlist.

### `DELETE /api/v1/watchlists/{watchlist_id}`

Deletes a watchlist.

### `PUT /api/v1/watchlists/{watchlist_id}/items`

Replaces the symbol list.

### `GET /api/v1/watchlists/{watchlist_id}/eod-metrics`

Required data fields:
- symbol
- last close
- change
- change percent
- volume
- turnover
- sector
- alert count
- position exposure

Database tables:
- `watchlists`
- `watchlist_items`
- `eod_stock_metrics`
- `alert_rules`
- `positions`

Aggregation jobs:
- optional `build_watchlist_eod_projection`

Mock data source:
- user watchlist fixture plus generated stock metrics

Future migration:
- keep user tables; replace metric source with real EOD metrics.

## Alerts Center

### `GET /api/v1/alerts`

Returns alert rules.

### `POST /api/v1/alerts`

Creates an EOD alert rule.

### `PATCH /api/v1/alerts/{alert_id}`

Updates status, threshold, or acknowledgement state.

### `DELETE /api/v1/alerts/{alert_id}`

Deletes an alert rule.

### `GET /api/v1/alerts/events`

Query:
- `from`
- `to`
- `status`

Required data fields:
- alert id
- symbol
- condition type
- trigger value
- threshold value
- event date
- severity
- status

Database tables:
- `alert_rules`
- `alert_events`
- `eod_stock_metrics`

Aggregation jobs:
- `evaluate_eod_alerts`

Mock data source:
- static alert rules evaluated against mock EOD metrics

Future migration:
- same evaluator runs after real EOD jobs.

## Portfolio / Position Manager

### `GET /api/v1/portfolio/summary`

Required data fields:
- account value
- cash
- market value
- daily PnL
- realized PnL
- unrealized PnL
- open position count
- closed trade count

### `GET /api/v1/portfolio/positions`

Returns open positions and latest EOD marks.

### `GET /api/v1/portfolio/trades`

Returns trade ledger rows.

### `POST /api/v1/portfolio/trades`

Creates a manual trade entry.

### `GET /api/v1/portfolio/closed-trades`

Returns closed trade records.

Database tables:
- `portfolio_accounts`
- `trades`
- `positions`
- `closed_trades`
- `position_daily_marks`
- `eod_prices`

Aggregation jobs:
- `rebuild_positions_from_trades`
- `mark_positions_eod`
- `build_closed_trades`

Mock data source:
- static trade ledger plus generated EOD closes

Future migration:
- broker import later writes into `trades`; analytics jobs unchanged.

## Performance Analytics

### `GET /api/v1/performance/equity-curve`

Returns daily account equity and cumulative return.

### `GET /api/v1/performance/drawdown`

Returns drawdown series and drawdown periods.

### `GET /api/v1/performance/summary`

Returns return, volatility, win rate, average win/loss, profit factor, expectancy, and max drawdown.

### `GET /api/v1/performance/attribution/setup`

Returns PnL and trade stats grouped by setup tag.

### `GET /api/v1/performance/attribution/sector`

Returns PnL and exposure grouped by sector.

### `GET /api/v1/performance/attribution/symbol`

Returns PnL and trade stats grouped by symbol.

Database tables:
- `portfolio_daily_equity`
- `performance_daily`
- `drawdown_periods`
- `closed_trades`
- `trade_setups`
- `performance_attribution`

Aggregation jobs:
- `compute_equity_curve`
- `compute_drawdowns`
- `compute_performance_summary`
- `compute_performance_attribution`

Mock data source:
- generated trade ledger and equity curve fixture

Future migration:
- computed from real trades and real daily marks.

## Journal Review Queue

### `GET /api/v1/journal/review-queue`

Query:
- `status`
- `reason`
- `symbol`

Required data fields:
- review id
- linked trade id
- linked symbol
- review reason
- priority
- status
- generated date
- notes

### `PATCH /api/v1/journal/review-queue/{review_id}`

Updates status or notes.

Database tables:
- `journal_entries`
- `journal_review_queue`
- `closed_trades`
- `alert_events`
- `drawdown_periods`

Aggregation jobs:
- `build_journal_review_queue`

Mock data source:
- generated from closed trade and drawdown fixtures

Future migration:
- generated from real closed trades, alerts, and performance analytics.

## Future Placeholders

These are not part of EOD phase implementation:
- `GET /api/v1/future/realtime/status`
- `GET /api/v1/future/order-flow/{symbol}/summary`
- `GET /api/v1/future/dom/{symbol}/snapshot`

They should stay documented as future placeholders only.
