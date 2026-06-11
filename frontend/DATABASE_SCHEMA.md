# Database Schema

## Purpose

Define the EOD-first PostgreSQL schema for AlphaTerminal.

Redis is intentionally not required for the first implementation phase. Add Redis only after mock and EOD API behavior is stable and query profiling shows a need.

## Core Conventions

- Primary keys: UUID for domain tables, bigserial only for high-volume append tables if needed later
- Dates: `trade_date date not null` for EOD facts
- Provenance fields on all imported or derived facts:
  - `source text not null`
  - `job_run_id uuid null`
  - `is_mock boolean not null default false`
  - `created_at timestamptz not null`
- User-scoped resources include `user_id`
- Keep realtime, tick, quote, and DOM tables out of phase 1

## Reference Tables

## `users`

- `id` UUID PK
- `email` text unique null
- `display_name` text null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

## `instruments`

- `id` UUID PK
- `symbol` text unique not null
- `name` text not null
- `exchange` text not null
- `asset_class` text not null default `'stock'`
- `currency` text not null default `'THB'`
- `sector_id` UUID FK null
- `industry` text null
- `underlying_instrument_id` UUID FK null
- `is_active` boolean not null default true
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Relationships:
- `sector_id` to `sectors.id`
- `underlying_instrument_id` supports future DR/options relationships

## `sectors`

- `id` UUID PK
- `code` text unique not null
- `name` text not null
- `display_order` integer not null default 0

## `sector_memberships`

- `id` UUID PK
- `sector_id` UUID FK not null
- `instrument_id` UUID FK not null
- `effective_from` date not null
- `effective_to` date null

Relationships:
- effective-date joins are required for historical sector attribution

## `trading_calendar`

- `trade_date` date PK
- `market` text not null
- `is_open` boolean not null
- `session_label` text null
- `notes` text null

## EOD Market Data Tables

## `eod_prices`

Daily OHLCV source table.

- `id` UUID PK
- `instrument_id` UUID FK not null
- `trade_date` date not null
- `open` numeric(18,6) not null
- `high` numeric(18,6) not null
- `low` numeric(18,6) not null
- `close` numeric(18,6) not null
- `volume` bigint null
- `turnover` numeric(24,2) null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(instrument_id, trade_date)`
- index `(trade_date)`

## `short_sales_daily`

- `id` UUID PK
- `instrument_id` UUID FK not null
- `trade_date` date not null
- `short_volume` bigint null
- `short_value` numeric(24,2) null
- `short_interest` bigint null
- `short_sma_5` numeric(24,6) null
- `short_sma_10` numeric(24,6) null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(instrument_id, trade_date)`

## `eod_index_prices`

- `id` UUID PK
- `index_symbol` text not null
- `trade_date` date not null
- `open` numeric(18,6) null
- `high` numeric(18,6) null
- `low` numeric(18,6) null
- `close` numeric(18,6) not null
- `change` numeric(18,6) null
- `change_pct` numeric(12,6) null
- `volume` bigint null
- `turnover` numeric(24,2) null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(index_symbol, trade_date)`

## EOD Derived Market Tables

## `eod_stock_metrics`

One row per symbol per date for stock detail, watchlist, dashboard, and screener.

- `id` UUID PK
- `instrument_id` UUID FK not null
- `trade_date` date not null
- `close` numeric(18,6) not null
- `change` numeric(18,6) null
- `change_pct` numeric(12,6) null
- `volume` bigint null
- `turnover` numeric(24,2) null
- `avg_volume_20d` numeric(24,6) null
- `return_5d_pct` numeric(12,6) null
- `return_20d_pct` numeric(12,6) null
- `return_60d_pct` numeric(12,6) null
- `ma_20` numeric(18,6) null
- `ma_50` numeric(18,6) null
- `ma_200` numeric(18,6) null
- `volatility_20d` numeric(12,6) null
- `week_52_high` numeric(18,6) null
- `week_52_low` numeric(18,6) null
- `distance_from_52w_high_pct` numeric(12,6) null
- `distance_from_52w_low_pct` numeric(12,6) null
- `liquidity_score` numeric(12,6) null
- `trend_score` numeric(12,6) null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(instrument_id, trade_date)`
- index `(trade_date, change_pct)`
- index `(trade_date, turnover)`

## `eod_screener_metrics`

Projection table optimized for screener queries.

- `id` UUID PK
- `instrument_id` UUID FK not null
- `trade_date` date not null
- `sector_id` UUID FK null
- `close` numeric(18,6) not null
- `change_pct` numeric(12,6) null
- `volume` bigint null
- `turnover` numeric(24,2) null
- `market_cap` numeric(24,2) null
- `liquidity_score` numeric(12,6) null
- `trend_score` numeric(12,6) null
- `volatility_20d` numeric(12,6) null
- `distance_from_52w_high_pct` numeric(12,6) null
- `distance_from_52w_low_pct` numeric(12,6) null
- `metric_payload` jsonb not null default '{}'::jsonb
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(instrument_id, trade_date)`
- index `(trade_date, sector_id)`
- index `(trade_date, liquidity_score)`
- index `(trade_date, trend_score)`

## `eod_market_summary`

- `id` UUID PK
- `trade_date` date unique not null
- `market_status` text not null
- `total_volume` bigint null
- `total_turnover` numeric(24,2) null
- `advancers` integer null
- `decliners` integer null
- `unchanged` integer null
- `new_highs` integer null
- `new_lows` integer null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

## `eod_market_breadth`

- `id` UUID PK
- `trade_date` date not null
- `universe_code` text not null
- `advancers` integer not null
- `decliners` integer not null
- `unchanged` integer not null
- `new_highs` integer null
- `new_lows` integer null
- `up_volume` bigint null
- `down_volume` bigint null
- `advance_decline_ratio` numeric(12,6) null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(trade_date, universe_code)`

## `universe_memberships`

- `id` UUID PK
- `universe_code` text not null
- `instrument_id` UUID FK not null
- `effective_from` date not null
- `effective_to` date null

## `eod_sector_performance`

- `id` UUID PK
- `sector_id` UUID FK not null
- `trade_date` date not null
- `equal_weight_return_pct` numeric(12,6) null
- `cap_weight_return_pct` numeric(12,6) null
- `volume` bigint null
- `turnover` numeric(24,2) null
- `advancers` integer null
- `decliners` integer null
- `leaders_json` jsonb null
- `laggards_json` jsonb null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(sector_id, trade_date)`

## Workspace Tables

## `watchlists`

- `id` UUID PK
- `user_id` UUID FK not null
- `name` text not null
- `is_default` boolean not null default false
- `sort_order` integer not null default 0
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

## `watchlist_items`

- `id` UUID PK
- `watchlist_id` UUID FK not null
- `instrument_id` UUID FK not null
- `sort_order` integer not null default 0
- `created_at` timestamptz not null

Indexes:
- unique `(watchlist_id, instrument_id)`

## `saved_screens`

- `id` UUID PK
- `user_id` UUID FK not null
- `name` text not null
- `filters_json` jsonb not null
- `sort_json` jsonb null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

## Alerts Tables

## `alert_rules`

- `id` UUID PK
- `user_id` UUID FK not null
- `instrument_id` UUID FK not null
- `rule_type` text not null
- `condition_json` jsonb not null
- `status` text not null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

EOD rule examples:
- close above/below price
- percent change above/below threshold
- volume above average multiple
- new 52-week high/low
- moving average cross based on daily metrics

## `alert_events`

- `id` UUID PK
- `alert_rule_id` UUID FK not null
- `instrument_id` UUID FK not null
- `metric_id` UUID FK null
- `trade_date` date not null
- `trigger_value` numeric(24,6) null
- `threshold_value` numeric(24,6) null
- `severity` text not null
- `status` text not null default `'new'`
- `payload` jsonb not null default '{}'::jsonb
- `created_at` timestamptz not null
- `acknowledged_at` timestamptz null

Relationships:
- `metric_id` can reference `eod_stock_metrics.id`

## Portfolio Tables

## `portfolio_accounts`

- `id` UUID PK
- `user_id` UUID FK not null
- `name` text not null
- `base_currency` text not null default `'THB'`
- `initial_cash` numeric(24,2) not null default 0
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

## `trades`

- `id` UUID PK
- `account_id` UUID FK not null
- `instrument_id` UUID FK not null
- `trade_date` date not null
- `side` text not null
- `quantity` numeric(24,6) not null
- `price` numeric(18,6) not null
- `fees` numeric(18,6) not null default 0
- `setup_id` UUID FK null
- `notes` text null
- `created_at` timestamptz not null

## `trade_setups`

- `id` UUID PK
- `user_id` UUID FK not null
- `name` text not null
- `description` text null
- `created_at` timestamptz not null

## `positions`

Current open positions.

- `id` UUID PK
- `account_id` UUID FK not null
- `instrument_id` UUID FK not null
- `quantity` numeric(24,6) not null
- `avg_cost` numeric(18,6) not null
- `opened_date` date null
- `updated_at` timestamptz not null

Indexes:
- unique `(account_id, instrument_id)`

## `position_daily_marks`

- `id` UUID PK
- `position_id` UUID FK not null
- `account_id` UUID FK not null
- `instrument_id` UUID FK not null
- `trade_date` date not null
- `quantity` numeric(24,6) not null
- `close_price` numeric(18,6) not null
- `market_value` numeric(24,2) not null
- `unrealized_pnl` numeric(24,2) null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(position_id, trade_date)`

## `closed_trades`

- `id` UUID PK
- `account_id` UUID FK not null
- `instrument_id` UUID FK not null
- `setup_id` UUID FK null
- `opened_date` date not null
- `closed_date` date not null
- `quantity` numeric(24,6) not null
- `avg_entry_price` numeric(18,6) not null
- `avg_exit_price` numeric(18,6) not null
- `gross_pnl` numeric(24,2) not null
- `fees` numeric(18,6) not null default 0
- `net_pnl` numeric(24,2) not null
- `return_pct` numeric(12,6) null
- `holding_days` integer null
- `created_at` timestamptz not null

## Performance Tables

## `portfolio_daily_equity`

- `id` UUID PK
- `account_id` UUID FK not null
- `trade_date` date not null
- `cash` numeric(24,2) null
- `market_value` numeric(24,2) null
- `equity` numeric(24,2) not null
- `daily_pnl` numeric(24,2) null
- `net_deposits` numeric(24,2) null default 0
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(account_id, trade_date)`

## `performance_daily`

- `id` UUID PK
- `account_id` UUID FK not null
- `trade_date` date not null
- `equity` numeric(24,2) not null
- `daily_return_pct` numeric(12,6) null
- `cumulative_return_pct` numeric(12,6) null
- `drawdown_pct` numeric(12,6) null
- `realized_pnl` numeric(24,2) null
- `unrealized_pnl` numeric(24,2) null
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Indexes:
- unique `(account_id, trade_date)`

## `drawdown_periods`

- `id` UUID PK
- `account_id` UUID FK not null
- `start_date` date not null
- `trough_date` date not null
- `recovered_date` date null
- `max_drawdown_pct` numeric(12,6) not null
- `max_drawdown_value` numeric(24,2) null
- `status` text not null
- `created_at` timestamptz not null

## `performance_attribution`

- `id` UUID PK
- `account_id` UUID FK not null
- `trade_date` date not null
- `attribution_type` text not null
- `attribution_key` text not null
- `gross_pnl` numeric(24,2) null
- `net_pnl` numeric(24,2) null
- `trade_count` integer null
- `win_rate` numeric(12,6) null
- `avg_return_pct` numeric(12,6) null
- `payload` jsonb not null default '{}'::jsonb
- `source` text not null
- `job_run_id` UUID null
- `is_mock` boolean not null default false
- `created_at` timestamptz not null

Values for `attribution_type`:
- `setup`
- `sector`
- `symbol`

## Journal Tables

## `journal_entries`

- `id` UUID PK
- `user_id` UUID FK not null
- `trade_id` UUID FK null
- `closed_trade_id` UUID FK null
- `instrument_id` UUID FK null
- `entry_date` date not null
- `title` text null
- `body` text null
- `tags` text[] null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

## `journal_review_queue`

- `id` UUID PK
- `user_id` UUID FK not null
- `closed_trade_id` UUID FK null
- `alert_event_id` UUID FK null
- `drawdown_period_id` UUID FK null
- `instrument_id` UUID FK null
- `review_reason` text not null
- `priority` integer not null default 0
- `status` text not null default `'open'`
- `generated_date` date not null
- `notes` text null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Review reasons:
- `large_loss`
- `large_win`
- `rule_break`
- `drawdown`
- `alert_followup`
- `setup_review`

## Job Audit Tables

## `eod_job_runs`

- `id` UUID PK
- `job_name` text not null
- `trade_date` date null
- `status` text not null
- `started_at` timestamptz not null
- `finished_at` timestamptz null
- `input_count` integer null
- `output_count` integer null
- `error_message` text null
- `metadata` jsonb not null default '{}'::jsonb

## `data_source_files`

- `id` UUID PK
- `job_run_id` UUID FK null
- `source` text not null
- `file_name` text not null
- `trade_date` date null
- `checksum` text null
- `row_count` integer null
- `loaded_at` timestamptz not null

## Phase 1 Table Set

Required for the first mock EOD backend:
- `users`
- `instruments`
- `sectors`
- `sector_memberships`
- `trading_calendar`
- `eod_prices`
- `eod_stock_metrics`
- `eod_screener_metrics`
- `eod_market_summary`
- `eod_market_breadth`
- `eod_sector_performance`
- `watchlists`
- `watchlist_items`
- `alert_rules`
- `alert_events`
- `portfolio_accounts`
- `trades`
- `positions`
- `position_daily_marks`
- `closed_trades`
- `portfolio_daily_equity`
- `performance_daily`
- `drawdown_periods`
- `performance_attribution`
- `journal_entries`
- `journal_review_queue`
- `eod_job_runs`

## Future Tables

Do not implement in the EOD phase:
- intraday bars
- ticks
- quotes
- order book snapshots
- websocket sessions

Reserve future compatibility through `instruments.asset_class`, not through realtime tables now.
