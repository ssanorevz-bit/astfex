# UI Components

## Purpose

This file provides a stable frontend-local component reference for AlphaTerminal planning.

Repository search note:
- no existing `UI_COMPONENTS.md` was found elsewhere in the repository
- this document is synthesized from `frontend/src` and the latest product module list

## Current Components In This Checkout

## `App.tsx`

Owns the current app shell and top-level state:
- selected symbols
- chart layout
- timeframe
- chart type
- indicators
- comparison symbols
- chart settings

Backend relevance:
- currently calls daily or intraday OHLCV APIs
- daily timeframe first attempts short-sales enriched candles

## `BasicChart.tsx`

Reusable chart surface for:
- OHLCV rendering
- chart type selection
- indicators
- comparison series
- markers
- load-more behavior for non-daily timeframes

Backend relevance:
- EOD phase must support daily OHLCV reliably
- future intraday support can reuse the same route family later

## `Sidebar.tsx`

Current sidebar tabs:
- Watchlist
- Tools
- Compare

Backend relevance:
- watchlist rows currently require `symbol`, `last`, `chg`, `chgPct`, and `volume`
- future backend persistence should replace local-only watchlist layouts

## `InstitutionalPanel.tsx`

Right-side analytics panel expecting a morning brief payload:
- `god_mode`
- `basket_flow`
- optional `vrp`
- optional `basis`
- optional `latent_analog`

Backend relevance:
- EOD backend can initially source this from EOD dashboard, breadth, and analytics tables

## `DrawingOverlay.tsx`

Implemented drawing overlay component, currently not mounted in the main chart flow.

Backend relevance:
- no EOD backend dependency for phase 1
- persistence can be planned later as workspace data

## Hooks

Current hooks:
- `useChartInit`
- `useChartResize`
- `useChartData`
- `useDrawingTools`
- `useWatchlistLayouts`

Backend relevance:
- `useWatchlistLayouts` currently persists to `localStorage`
- future backend should expose watchlist and workspace endpoints

## Product Modules To Support

The latest product surface includes modules beyond the currently visible code. Backend docs should plan for these modules:
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

## Data Contract Priority

Component planning should prefer:
- stable row objects for table-like views
- explicit metric objects for detail pages
- separate user context objects for watchlist, alerts, and portfolio state
- EOD-first response fields before realtime fields
