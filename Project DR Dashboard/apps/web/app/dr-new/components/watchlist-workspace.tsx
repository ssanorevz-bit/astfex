"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DrNewRow, drNewRows } from "../mock-dr-new-data";
import { getUnderlyingEodQuote } from "../underlying-eod-quotes";

type WatchTab = "all" | "moves" | "dividends" | "tradingActivity" | "events";
type SortKey = "updated" | "move" | "tradingValue" | "dividend";

type WatchItem = {
  row: DrNewRow;
  note: string;
  tags: string[];
  updated: string;
};

const tabs: Array<{ key: WatchTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "moves", label: "Price Moves" },
  { key: "dividends", label: "Dividends" },
  { key: "tradingActivity", label: "Low Trading Activity" },
  { key: "events", label: "Events" }
];

const watchItems: WatchItem[] = [
  { row: getRow("NVDA80"), note: "Watch AI momentum before earnings", tags: ["AI", "Earnings"], updated: "2026-06-02" },
  { row: getRow("JEPI19"), note: "Income candidate for monthly distribution", tags: ["Income", "Dividend"], updated: "2026-06-02" },
  { row: getRow("MSFT80"), note: "Long-term watch for cloud growth", tags: ["AI", "Long-term"], updated: "2026-06-01" },
  { row: getRow("BABA80"), note: "China tech rebound watch", tags: ["China Tech"], updated: "2026-06-02" },
  { row: getRow("AMD80"), note: "Compare with NVDA and AVGO", tags: ["Semiconductor"], updated: "2026-06-02" },
  { row: getRow("LLY80"), note: "Healthcare core watch", tags: ["Healthcare"], updated: "2026-05-31" },
  { row: getRow("CATL01"), note: "Battery supply chain leader", tags: ["EV"], updated: "2026-06-02" },
  { row: getRow("FPT80"), note: "Vietnam tech exposure", tags: ["Vietnam"], updated: "2026-06-01" },
  { row: getRow("VNM80"), note: "Dividend and consumer defensive watch", tags: ["Dividend", "Consumer"], updated: "2026-05-30" },
  { row: getRow("MICRON01"), note: "Memory cycle monitor", tags: ["Semiconductor"], updated: "2026-06-02" },
  { row: getRow("TENCENT80"), note: "Hong Kong internet bellwether", tags: ["China Tech"], updated: "2026-06-01" },
  { row: getRow("RKLB03"), note: "Speculative, check trading activity first", tags: ["Low Trading Activity"], updated: "2026-05-29" }
];

function getRow(ticker: string) {
  const row = drNewRows.find((item) => item.ticker === ticker);
  if (!row) throw new Error(`Missing watchlist row: ${ticker}`);
  return row;
}

function formatPct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
  return `THB ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTradingValue(value: number) {
  if (value >= 1) return `THB ${value.toFixed(2)}M`;
  return `THB ${(value * 1000).toFixed(0)}K`;
}

function eventLabel(item: WatchItem) {
  if (/distribution|Dividend|XD/i.test(`${item.row.nextEvent} ${item.row.alert} ${item.note}`)) return "Dividend";
  if (/Earnings|growth|Cloud|data|update/i.test(item.row.nextEvent)) return "Earnings";
  if (Math.abs(item.row.changePct) >= 0.5) return "Price Move";
  if (item.row.turnoverM < 0.05) return "Low Trading";
  return "Market Event";
}

function eventBadgeClass(item: WatchItem) {
  const label = eventLabel(item);
  if (label === "Dividend") return "dividend";
  if (label === "Earnings") return "earnings";
  if (label === "Price Move") return "move";
  if (label === "Low Trading") return "low";
  return "market";
}

function rowMatches(item: WatchItem, query: string) {
  const text = `${item.row.ticker} ${item.row.underlying} ${item.row.company} ${item.row.theme} ${item.note} ${item.tags.join(" ")}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function filterByTab(item: WatchItem, tab: WatchTab) {
  if (tab === "all") return true;
  if (tab === "moves") return Math.abs(item.row.changePct) >= 0.45;
  if (tab === "dividends") return item.tags.includes("Dividend") || /distribution|Dividend|XD/i.test(`${item.row.nextEvent} ${item.row.alert}`);
  if (tab === "tradingActivity") return item.row.turnoverM < 0.05 || item.tags.includes("Low Trading Activity");
  return !["Normal", "Watch"].includes(item.row.alert) || /Earnings|growth|data|update|macro/i.test(item.row.nextEvent);
}

function sortItems(items: WatchItem[], sortKey: SortKey) {
  const sorted = [...items];
  if (sortKey === "move") return sorted.sort((left, right) => Math.abs(right.row.changePct) - Math.abs(left.row.changePct));
  if (sortKey === "tradingValue") return sorted.sort((left, right) => right.row.turnoverM - left.row.turnoverM);
  if (sortKey === "dividend") return sorted.sort((left, right) => (right.row.dividendYield ?? -1) - (left.row.dividendYield ?? -1));
  return sorted.sort((left, right) => right.updated.localeCompare(left.updated));
}

export function WatchlistWorkspace() {
  const [activeTab, setActiveTab] = useState<WatchTab>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [selectedTicker, setSelectedTicker] = useState(watchItems[0].row.ticker);

  const visibleItems = useMemo(() => {
    return sortItems(
      watchItems.filter((item) => filterByTab(item, activeTab)).filter((item) => rowMatches(item, query)),
      sortKey
    );
  }, [activeTab, query, sortKey]);

  const selectedItem = watchItems.find((item) => item.row.ticker === selectedTicker) ?? watchItems[0];
  const selectedQuote = getUnderlyingEodQuote(selectedItem.row);
  const movedToday = watchItems.filter((item) => Math.abs(item.row.changePct) >= 0.45).length;
  const dividendEvents = watchItems.filter((item) => filterByTab(item, "dividends")).length;
  const lowTradingActivity = watchItems.filter((item) => filterByTab(item, "tradingActivity")).length;

  return (
    <div className="drWatchWorkspace">
      <section className="drWatchHero compact">
        <span className="drRankingBadge">EOD Data</span>
        <strong>Track saved Thai DRs after market close</strong>
        <p>ติดตามราคา, movement, trading activity, event ถัดไป และ note ของคุณ.</p>
      </section>

      <section className="drWatchSummary">
        <article><span>Watching</span><strong>{watchItems.length}</strong></article>
        <article><span>Moved Today</span><strong>{movedToday}</strong></article>
        <article><span>Dividend Events</span><strong>{dividendEvents}</strong></article>
        <article><span>Low Trading Activity</span><strong>{lowTradingActivity}</strong></article>
      </section>

      <section className="drWatchControls">
        <div className="drWatchTabs">
          {tabs.map((tab) => (
            <button className={tab.key === activeTab ? "active" : ""} key={tab.key} onClick={() => setActiveTab(tab.key)} type="button">
              {tab.label}
            </button>
          ))}
        </div>
        <div className="drWatchFilters">
          <label>
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticker, company, note..." />
          </label>
          <label>
            <span>Sort by</span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="updated">Last Updated</option>
              <option value="move">1D Move</option>
              <option value="tradingValue">Trading Value</option>
              <option value="dividend">Dividend Yield</option>
            </select>
          </label>
        </div>
      </section>

      <section className="drWatchLayout">
        <div className="drWatchTable">
          <div className="header">
            <span>DR</span><span>Underlying</span><span>Company</span><span>Theme</span><span>DR Price</span><span>1D %</span><span>Trading Value</span><span>Next Event</span>
          </div>
          {visibleItems.length === 0 ? (
            <div className="drWatchEmpty">No saved Thai DRs matched this view.</div>
          ) : null}
          {visibleItems.map((item) => (
            <button className={item.row.ticker === selectedTicker ? "active" : ""} key={item.row.ticker} onClick={() => setSelectedTicker(item.row.ticker)} type="button">
              <strong>{item.row.ticker}</strong>
              <span>{item.row.underlying}</span>
              <span>{item.row.company}</span>
              <span>{item.row.theme}</span>
              <span>{formatPrice(item.row.price)}</span>
              <span className={item.row.changePct >= 0 ? "positive" : "negative"}>{formatPct(item.row.changePct)}</span>
              <span className="numeric">{formatTradingValue(item.row.turnoverM)}</span>
              <span className={`drWatchEventBadge ${eventBadgeClass(item)}`}>{eventLabel(item)}</span>
            </button>
          ))}
        </div>

        <aside className="drWatchSidePanel">
          <span className="drNewKicker">Selected DR</span>
          <h2>{selectedItem.row.ticker}</h2>
          <p>{selectedItem.row.company} DR</p>
          <div className="drWatchTagRow">
            {selectedItem.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="drWatchDetailGrid">
            <article><span>DR Price</span><strong>{formatPrice(selectedItem.row.price)}</strong></article>
            <article><span>1D</span><strong>{formatPct(selectedItem.row.changePct)}</strong></article>
            <article><span>Trading Value</span><strong>{formatTradingValue(selectedItem.row.turnoverM)}</strong></article>
            <article><span>Underlying</span><strong>{selectedItem.row.underlying}</strong></article>
            <article><span>Underlying Price</span><strong>{selectedQuote.currency} {selectedQuote.price.toLocaleString("en-US")}</strong></article>
            <article><span>Ratio</span><strong>{selectedItem.row.ratio}</strong></article>
          </div>
          <div className="drWatchNoteBox">
            <span>User Note</span>
            <p>{selectedItem.note}</p>
          </div>
          <div className="drWatchActions">
            <Link href={`/dr-new/${selectedItem.row.ticker}`}>View Detail</Link>
            <Link href={`/dr-new/compare?underlying=${selectedItem.row.underlying}`}>Compare</Link>
            <button type="button">Edit Note</button>
            <button type="button">Remove</button>
          </div>
        </aside>
      </section>

      <section className="drWatchGroups">
        <span className="drNewKicker">Watchlist Groups</span>
        <div>
          <button type="button">All Watchlist</button>
          <button type="button">Income</button>
          <button type="button">AI / Semiconductor</button>
          <button type="button">China Tech</button>
          <button type="button">ETF / Index</button>
          <button type="button">Custom +</button>
        </div>
      </section>
    </div>
  );
}
