# Design System

## Purpose

This file gives backend and product planning a stable frontend-local reference for AlphaTerminal's UI direction.

Repository search note:
- no existing `DESIGN_SYSTEM.md` was found elsewhere in the repository
- this document is synthesized from the current frontend source and product context

## Product Feel

AlphaTerminal is a market workstation. The interface should feel:
- information-dense
- calm
- fast to scan
- operational rather than promotional
- suitable for repeated daily use

## Current Visual Direction In Code

The current frontend uses:
- dark workstation shell by default
- CSS variables in `frontend/src/index.css`
- glass-like panels and low-contrast borders
- compact top navigation
- left sidebar for watchlist/tools/compare
- central chart workspace
- right institutional analytics panel
- green/red trend colors for positive and negative market movement

## UI Principles

For future frontend work:
- keep dense market data readable
- preserve compact controls
- avoid landing-page style layouts inside the app
- keep primary filters and market choices visible
- use consistent trend colors for gain/loss and bullish/bearish states
- prefer tables, segmented controls, compact cards, and panels for workstation workflows
- avoid hiding core market controls behind broad "more" menus

## Backend Planning Implications

Backend responses should support:
- compact rows for tables and watchlists
- summary blocks for dashboards
- stable display labels for sectors, setup tags, and alert reasons
- explicit freshness fields such as `trade_date`, `as_of`, `source`, and `is_mock`
- traceable metrics so UI badges and status states can explain stale, missing, or mock data

## Current Module Display Needs

Dashboard:
- summary cards, market status, alerts count, portfolio summary

Market Overview:
- index cards, movers, turnover leaders

Market Breadth:
- breadth counters and history series

Sector Analysis:
- sector ranking and constituent leaders/laggards

Stock Detail:
- profile, daily chart, metrics, alerts, positions

Screener:
- filter metadata and sortable rows

Watchlist:
- compact symbol metrics and user layouts

Alerts Center:
- rule list and generated event list

Portfolio / Position Manager:
- positions, trades, closed trades, marks

Performance Analytics:
- equity curve, drawdown, attribution, review queue
