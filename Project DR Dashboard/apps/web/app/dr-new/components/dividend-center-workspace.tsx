"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ThaiDrDividendEvent } from "../data";
import { getSingleDrDetail } from "../data";

type DividendStatus = "Upcoming XD" | "Payment Soon" | "Paid" | "Not Yet Scheduled" | "No Recent Dividend";
type DividendSource = "DR Dividend" | "Underlying Dividend";
type DividendType = "Regular" | "Special" | "Monthly" | "Quarterly" | "Semi-Annual" | "Annual";
type DividendTab = "upcomingXd" | "paymentSoon" | "watchlist" | "history" | "calendar";

type DividendEvent = {
  id: string;
  drSymbol: string;
  underlyingSymbol: string;
  companyName: string;
  country: string;
  assetType: "Stock DR" | "ETF DR" | "Bond DR" | "Commodity DR";
  theme: string;
  source: DividendSource;
  status: DividendStatus;
  dividendType: DividendType;
  frequency: "Monthly" | "Quarterly" | "Semi-Annual" | "Annual" | "Unknown";
  xdDate?: string;
  paymentDate?: string;
  amount?: number;
  currency: string;
  yieldPct?: number;
  lastXdDate?: string;
  lastPaymentDate?: string;
  nextExpected?: string;
  note: string;
};

const assetTypeOptions = ["All", "Stock DR", "ETF DR", "Bond DR", "Commodity DR"] as const;
const countryOptions = ["All", "US", "Hong Kong", "China", "Japan", "Vietnam"] as const;
const dividendTypeOptions = ["All", "Regular", "Special", "Monthly", "Quarterly", "Semi-Annual", "Annual"] as const;
const themeOptions = ["All", "Technology", "Finance", "Consumer", "Healthcare", "Index ETF", "Bond", "Commodity"] as const;

const tabs: Array<{ key: DividendTab; label: string }> = [
  { key: "upcomingXd", label: "Upcoming XD" },
  { key: "paymentSoon", label: "Payment Soon" },
  { key: "watchlist", label: "Dividend Watchlist" },
  { key: "history", label: "History" },
  { key: "calendar", label: "Calendar" }
];

const defaultSortByTab: Record<DividendTab, string> = {
  upcomingXd: "XD Date",
  paymentSoon: "Payment Date",
  watchlist: "Yield",
  history: "XD Date",
  calendar: "Date"
};

const sortOptionsByTab: Record<DividendTab, string[]> = {
  upcomingXd: ["XD Date", "Payment Date", "Yield", "Amount", "DR A-Z"],
  paymentSoon: ["Payment Date", "XD Date", "Yield", "Amount", "DR A-Z"],
  watchlist: ["Yield", "Last XD Date", "Frequency", "DR A-Z"],
  history: ["XD Date", "Payment Date", "Amount", "Yield", "DR A-Z"],
  calendar: ["Date", "Event", "DR A-Z"]
};

function broadTheme(theme: string) {
  if (theme.includes("Financial")) return "Finance";
  if (theme.includes("Healthcare")) return "Healthcare";
  if (theme.includes("Consumer")) return "Consumer";
  if (theme.includes("Index")) return "Index ETF";
  if (theme.includes("Bond")) return "Bond";
  if (theme.includes("Energy")) return "Commodity";
  return "Technology";
}

function normalizeDividendEvents(events: ThaiDrDividendEvent[]): DividendEvent[] {
  return events.map((event) => {
    const row = getSingleDrDetail(event.drSymbol);
    return {
      id: event.id,
      drSymbol: event.drSymbol,
      underlyingSymbol: event.underlyingSymbol,
      companyName: row?.company ?? event.underlyingSymbol,
      country: row?.region ?? "—",
      assetType: row?.assetType === "ETF DR" || row?.assetType === "Index DR" ? "ETF DR" : "Stock DR",
      theme: broadTheme(row?.theme ?? ""),
      source: "DR Dividend",
      status: event.status === "Not Announced" ? "Not Yet Scheduled" : event.status,
      dividendType: "Regular",
      frequency: "Unknown",
      xdDate: event.xdDate ?? undefined,
      paymentDate: event.paymentDate ?? undefined,
      amount: event.amountThb ?? undefined,
      currency: event.currency,
      yieldPct: row?.dividendYield ?? undefined,
      note: event.note ?? "Thai DR dividend event"
    };
  });
}

function formatAmount(event: DividendEvent) {
  if (event.amount === undefined) return "—";
  return event.amount.toLocaleString("en-US", { minimumFractionDigits: event.amount < 1 ? 3 : 2, maximumFractionDigits: event.amount < 1 ? 3 : 2 });
}

function dateValue(value?: string) {
  return value ?? "9999-12-31";
}

function sortEvents(events: DividendEvent[], sortBy: string) {
  return [...events].sort((left, right) => {
    if (sortBy === "Date") return dateValue(left.xdDate ?? left.paymentDate).localeCompare(dateValue(right.xdDate ?? right.paymentDate));
    if (sortBy === "Event") return left.status.localeCompare(right.status);
    if (sortBy === "Payment Date") return dateValue(left.paymentDate).localeCompare(dateValue(right.paymentDate));
    if (sortBy === "Yield") return (right.yieldPct ?? 0) - (left.yieldPct ?? 0);
    if (sortBy === "Amount") return (right.amount ?? 0) - (left.amount ?? 0);
    if (sortBy === "Last XD Date") return dateValue(right.lastXdDate ?? right.xdDate).localeCompare(dateValue(left.lastXdDate ?? left.xdDate));
    if (sortBy === "Last Paid") return dateValue(right.lastPaymentDate ?? right.paymentDate).localeCompare(dateValue(left.lastPaymentDate ?? left.paymentDate));
    if (sortBy === "Frequency") return left.frequency.localeCompare(right.frequency);
    if (sortBy === "DR A-Z") return left.drSymbol.localeCompare(right.drSymbol);
    if (sortBy === "Company A-Z") return left.companyName.localeCompare(right.companyName);
    return dateValue(left.xdDate).localeCompare(dateValue(right.xdDate));
  });
}

export function DividendCenterWorkspace({ events: sourceEvents }: { events: ThaiDrDividendEvent[] }) {
  const [activeTab, setActiveTab] = useState<DividendTab>("upcomingXd");
  const [assetType, setAssetType] = useState<(typeof assetTypeOptions)[number]>("All");
  const [country, setCountry] = useState<(typeof countryOptions)[number]>("All");
  const [divType, setDivType] = useState<(typeof dividendTypeOptions)[number]>("All");
  const [theme, setTheme] = useState<(typeof themeOptions)[number]>("All");
  const [sortBy, setSortBy] = useState(defaultSortByTab.upcomingXd);
  const [query, setQuery] = useState("");
  const events = useMemo(() => normalizeDividendEvents(sourceEvents), [sourceEvents]);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events.filter((event) => {
      if (assetType !== "All" && event.assetType !== assetType) return false;
      if (country !== "All" && event.country !== country) return false;
      if (divType !== "All" && event.dividendType !== divType) return false;
      if (theme !== "All" && event.theme !== theme) return false;
      if (!normalized) return true;
      return [event.drSymbol, event.underlyingSymbol, event.companyName].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [assetType, country, divType, events, query, theme]);

  const upcomingXdEvents = sortEvents(filteredEvents.filter((event) => event.status === "Upcoming XD"), sortBy);
  const paymentSoonEvents = sortEvents(filteredEvents.filter((event) => event.status === "Payment Soon"), sortBy);
  const watchlistEvents = sortEvents(filteredEvents.filter((event) => event.status === "Not Yet Scheduled" || event.status === "No Recent Dividend"), sortBy);
  const historyEvents = sortEvents(filteredEvents.filter((event) => event.status === "Paid"), sortBy);
  const calendarEvents = sortEvents(filteredEvents.filter((event) => event.status === "Upcoming XD" || event.status === "Payment Soon" || event.status === "Paid"), sortBy);

  const summary = {
    upcomingXd: events.filter((event) => event.status === "Upcoming XD").length,
    upcomingPayment: events.filter((event) => event.status === "Payment Soon").length,
    watchlist: events.filter((event) => event.status === "Not Yet Scheduled").length,
    paidThisYear: events.filter((event) => event.status === "Paid").length
  };

  return (
    <div className="drDividendCenter">
      <section className="drDividendSummary" aria-label="Dividend summary">
        <span>Upcoming XD: <strong>{summary.upcomingXd}</strong></span>
        <span>Payment Soon: <strong>{summary.upcomingPayment}</strong></span>
        <span>Dividend Watchlist: <strong>{summary.watchlist}</strong></span>
        <span>Paid this year: <strong>{summary.paidThisYear}</strong></span>
      </section>

      <section className="drDividendFilters">
        <div className="drDividendToolbar">
          <label>
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DR, underlying, company..." />
          </label>
          <label>
            <span>Country</span>
            <select value={country} onChange={(event) => setCountry(event.target.value as (typeof countryOptions)[number])}>
              {countryOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Asset Type</span>
            <select value={assetType} onChange={(event) => setAssetType(event.target.value as (typeof assetTypeOptions)[number])}>
              {assetTypeOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Dividend Type</span>
            <select value={divType} onChange={(event) => setDivType(event.target.value as (typeof dividendTypeOptions)[number])}>
              {dividendTypeOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <details className="drDividendMoreFilters">
            <summary>+ More Filters</summary>
            <label>
              <span>Theme</span>
              <select value={theme} onChange={(event) => setTheme(event.target.value as (typeof themeOptions)[number])}>
                {themeOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </details>
        </div>
      </section>

      <section className="drDividendTabsShell">
        <div className="drDividendTableControls">
          <div className="drNewTabs" role="tablist" aria-label="Dividend tabs">
            {tabs.map((tab) => (
              <button
                type="button"
                className={activeTab === tab.key ? "active" : ""}
                aria-selected={activeTab === tab.key}
                role="tab"
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSortBy(defaultSortByTab[tab.key]);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="drDividendSortControl">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {sortOptionsByTab[activeTab].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>

        {activeTab === "upcomingXd" ? <UpcomingTable events={upcomingXdEvents} /> : null}
        {activeTab === "paymentSoon" ? <UpcomingTable events={paymentSoonEvents} /> : null}
        {activeTab === "watchlist" ? <WatchlistTable events={watchlistEvents} /> : null}
        {activeTab === "history" ? <HistoryTable events={historyEvents} /> : null}
        {activeTab === "calendar" ? <CalendarTable events={calendarEvents} /> : null}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: DividendStatus }) {
  const label = status === "Not Yet Scheduled" ? "Not Announced" : status;
  return <span className={`drDividendStatus ${status.toLowerCase().replaceAll(" ", "-")}`}>{label}</span>;
}

function EmptyState() {
  return <div className="drDividendEmpty">No announced Thai DR dividend yet.</div>;
}

function UpcomingTable({ events }: { events: DividendEvent[] }) {
  if (!events.length) return <EmptyState />;
  return (
    <div className="drDividendTable upcoming">
      <div className="header"><span>DR</span><span>Underlying</span><span>Company / Fund</span><span>XD Date</span><span>Payment Date</span><span>Amount / DR</span><span>Yield</span><span>Action</span></div>
      {events.map((event) => (
        <div key={event.id}>
          <strong>{event.drSymbol}</strong>
          <span>{event.underlyingSymbol}</span>
          <span className="drNameClamp" title={event.companyName}>{event.companyName}</span>
          <span>{event.xdDate ?? "—"}</span>
          <span>{event.paymentDate ?? "—"}</span>
          <span>{formatAmount(event)} {event.currency}</span>
          <span>{event.yieldPct === undefined ? "—" : `${event.yieldPct.toFixed(1)}%`}</span>
          <Link href={`/dr-new/${event.drSymbol}`}>View</Link>
        </div>
      ))}
    </div>
  );
}

function WatchlistTable({ events }: { events: DividendEvent[] }) {
  if (!events.length) return <EmptyState />;
  return (
    <>
      <p className="drDividendNote">Items in Dividend Watchlist are not confirmed upcoming dividends. They are based on historical dividend records and should be monitored for official announcements.</p>
      <div className="drDividendTable watchlist">
        <div className="header"><span>DR</span><span>Underlying</span><span>Company / Fund</span><span>Last XD</span><span>Last Payment</span><span>Frequency</span><span>Yield</span><span>Next Expected</span><span>Action</span></div>
        {events.map((event) => (
          <div key={event.id}>
            <strong>{event.drSymbol}</strong>
            <span>{event.underlyingSymbol}</span>
            <span className="drNameClamp" title={event.companyName}>{event.companyName}</span>
            <span>{event.lastXdDate ?? "—"}</span>
            <span>{event.lastPaymentDate ?? "—"}</span>
            <span>{event.frequency}</span>
            <span>{event.yieldPct === undefined ? "—" : `${event.yieldPct.toFixed(1)}%`}</span>
            <span>{event.nextExpected ?? "Not Announced"}</span>
            <Link href={`/dr-new/${event.drSymbol}`}>View</Link>
          </div>
        ))}
      </div>
    </>
  );
}

function HistoryTable({ events }: { events: DividendEvent[] }) {
  if (!events.length) return <EmptyState />;
  return (
    <div className="drDividendTable history">
      <div className="header"><span>DR</span><span>Underlying</span><span>Company / Fund</span><span>XD Date</span><span>Payment Date</span><span>Amount / DR</span><span>Currency</span><span>Type</span><span>Action</span></div>
      {events.map((event) => (
        <div key={event.id}>
          <strong>{event.drSymbol}</strong>
          <span>{event.underlyingSymbol}</span>
          <span className="drNameClamp" title={event.companyName}>{event.companyName}</span>
          <span>{event.xdDate ?? "—"}</span>
          <span>{event.paymentDate ?? "—"}</span>
          <span>{formatAmount(event)}</span>
          <span>{event.currency}</span>
          <span>{event.dividendType}</span>
          <Link href={`/dr-new/${event.drSymbol}`}>View</Link>
        </div>
      ))}
    </div>
  );
}

function CalendarTable({ events }: { events: DividendEvent[] }) {
  const calendarRows = events.flatMap((event) => [
    event.xdDate ? { event, date: event.xdDate, eventLabel: "XD Date" } : null,
    event.paymentDate ? { event, date: event.paymentDate, eventLabel: "Payment Date" } : null
  ]).filter((item): item is { event: DividendEvent; date: string; eventLabel: string } => item !== null)
    .sort((left, right) => left.date.localeCompare(right.date));

  if (!calendarRows.length) return <EmptyState />;
  return (
    <div className="drDividendTable calendar">
      <div className="header"><span>Date</span><span>Event</span><span>DR</span><span>Company / Fund</span><span>Amount</span><span>Status</span><span>Action</span></div>
      {calendarRows.map((item) => (
        <div key={`${item.event.id}-${item.eventLabel}`}>
          <span>{item.date}</span>
          <span>{item.eventLabel}</span>
          <strong>{item.event.drSymbol}</strong>
          <span className="drNameClamp" title={item.event.companyName}>{item.event.companyName}</span>
          <span>{formatAmount(item.event)} {item.event.currency}</span>
          <StatusBadge status={item.event.status} />
          <Link href={`/dr-new/${item.event.drSymbol}`}>View</Link>
        </div>
      ))}
    </div>
  );
}
