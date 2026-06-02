"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DrNewRow } from "../mock-dr-new-data";

type CalendarEventType = "Dividend XD" | "Dividend Payment" | "Earnings" | "New DR Listing" | "Market Holiday" | "Market Event";
type CalendarWindow = "upcoming" | "month" | "watch" | "holidays";

type CalendarEvent = {
  id: string;
  date: string;
  type: CalendarEventType;
  drSymbol?: string;
  underlying?: string;
  company: string;
  country: string;
  assetType: string;
  theme: string;
  title: string;
  note: string;
  priority: "High" | "Medium" | "Low";
};

const eventTypes = ["All", "Dividend XD", "Dividend Payment", "Earnings", "New DR Listing", "Market Holiday", "Market Event"] as const;
const countries = ["All", "US", "Hong Kong", "China", "Japan", "Vietnam"] as const;
const windows: Array<{ key: CalendarWindow; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "month", label: "This Month" },
  { key: "watch", label: "Watchlist" },
  { key: "holidays", label: "Market Holidays" }
];

function findRow(rows: DrNewRow[], ticker: string) {
  const row = rows.find((item) => item.ticker === ticker);
  if (!row) throw new Error(`Missing calendar row: ${ticker}`);
  return row;
}

function rowEvent(row: DrNewRow, date: string, type: CalendarEventType, title: string, note: string, priority: CalendarEvent["priority"]): CalendarEvent {
  return {
    id: `${row.ticker}-${type}-${date}`,
    date,
    type,
    drSymbol: row.ticker,
    underlying: row.underlying,
    company: row.company,
    country: row.region,
    assetType: row.assetType,
    theme: row.theme,
    title,
    note,
    priority
  };
}

function marketHolidayEvent(date: string, country: string, title: string, note: string): CalendarEvent {
  return {
    id: `${country}-holiday-${date}`,
    date,
    type: "Market Holiday",
    company: title,
    country,
    assetType: "Source Market",
    theme: "Source Market",
    title,
    note,
    priority: "High"
  };
}

function createCalendarEvents(rows: DrNewRow[]) {
  const nvda = findRow(rows, "NVDA80");
  const jepi = findRow(rows, "JEPI19");
  const msft = findRow(rows, "MSFT80");
  const baba = findRow(rows, "BABA80");
  const catl = findRow(rows, "CATL01");
  const fpt = findRow(rows, "FPT80");
  const hitachi = findRow(rows, "HITACHI24");
  const vnm = findRow(rows, "VNM80");
  const tencent = findRow(rows, "TENCENT80");
  const sp500 = findRow(rows, "SP500US80");
  const micron = findRow(rows, "MICRON01");
  const lly = findRow(rows, "LLY80");

  return [
    rowEvent(jepi, "2026-06-12", "Dividend XD", "JEPI19 XD watch", "Monthly income ETF dividend date to monitor.", "High"),
    rowEvent(vnm, "2026-06-14", "Dividend XD", "VNM80 dividend watch", "Consumer dividend candidate with historical payout profile.", "Medium"),
    rowEvent(msft, "2026-06-18", "Dividend Payment", "MSFT80 payment window", "Estimated DR payment window from prior declared dividend flow.", "Medium"),
    rowEvent(nvda, "2026-06-20", "Earnings", "NVIDIA earnings watch", "Underlying earnings event can affect DR watchlist and AI theme rankings.", "High"),
    rowEvent(baba, "2026-06-24", "Market Event", "China macro data", "China tech DRs may react after latest source-market close.", "Medium"),
    rowEvent(catl, "2026-06-26", "Market Event", "Battery pricing update", "EV and battery DRs to monitor after monthly supply-chain read.", "Medium"),
    marketHolidayEvent("2026-07-03", "US", "US market holiday", "Nasdaq and NYSE closed. US underlying EOD data may not update."),
    rowEvent(micron, "2026-07-08", "Earnings", "Micron earnings watch", "Semiconductor memory cycle event for AI infrastructure basket.", "Medium"),
    rowEvent(lly, "2026-07-10", "Earnings", "Healthcare data watch", "Healthcare DR theme event tied to obesity drug pipeline updates.", "Medium"),
    rowEvent(fpt, "2026-07-15", "New DR Listing", "Vietnam DR list review", "Placeholder listing review for Vietnam technology coverage.", "Low"),
    rowEvent(tencent, "2026-07-18", "Market Event", "Game approval read", "Hong Kong / China internet event to monitor after close.", "Medium"),
    rowEvent(hitachi, "2026-07-25", "Earnings", "Japan earnings window", "Japan industrial DR event with different source-market timezone.", "Low")
  ];
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function daysUntil(date: string) {
  const today = new Date("2026-06-02T00:00:00");
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function typeClass(type: CalendarEventType) {
  return type.toLowerCase().replaceAll(" ", "-");
}

function eventTypeLabel(type: CalendarEventType) {
  if (type === "Dividend XD") return "XD Date";
  if (type === "Dividend Payment") return "Payment Date";
  if (type === "New DR Listing") return "New Listing";
  return type;
}

function filterTypeLabel(type: (typeof eventTypes)[number]) {
  if (type === "All") return "All";
  return eventTypeLabel(type);
}

export function CalendarWorkspace({ rows }: { rows: DrNewRow[] }) {
  const [activeWindow, setActiveWindow] = useState<CalendarWindow>("upcoming");
  const [eventType, setEventType] = useState<(typeof eventTypes)[number]>("All");
  const [country, setCountry] = useState<(typeof countries)[number]>("All");
  const [query, setQuery] = useState("");
  const events = useMemo(() => createCalendarEvents(rows), [rows]);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events
      .filter((event) => activeWindow === "month" ? event.date.startsWith("2026-06") : activeWindow === "watch" ? event.priority !== "Low" : activeWindow === "holidays" ? event.type === "Market Holiday" : daysUntil(event.date) >= 0)
      .filter((event) => eventType === "All" || event.type === eventType)
      .filter((event) => country === "All" || event.country === country)
      .filter((event) => {
        if (!normalized) return true;
        return [event.drSymbol, event.underlying, event.company, event.title, event.country, event.type, event.theme].filter(Boolean).some((value) => value!.toLowerCase().includes(normalized));
      })
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [activeWindow, country, eventType, events, query]);

  const summary = {
    upcoming: events.filter((event) => daysUntil(event.date) >= 0).length,
    dividends: events.filter((event) => event.type === "Dividend XD" || event.type === "Dividend Payment").length,
    earnings: events.filter((event) => event.type === "Earnings").length,
    market: events.filter((event) => event.type === "Market Holiday" || event.type === "Market Event").length
  };

  const nextEvent = filteredEvents[0] ?? events[0];

  return (
    <div className="drCalendarWorkspace">
      <section className="drCalendarHero compact">
        <div>
          <span className="drRankingBadge">EOD Data · Updated after latest market close</span>
          <h2>DR event timeline</h2>
          <p>Track events affecting Thai DRs and underlying assets after the latest EOD update.</p>
        </div>
      </section>

      <section className="drCalendarStats">
        <span>Next Event <strong>{nextEvent.title}</strong><small>{formatDate(nextEvent.date)}</small></span>
        <span>Upcoming <strong>{summary.upcoming}</strong></span>
        <span>Dividends <strong>{summary.dividends}</strong></span>
        <span>Earnings <strong>{summary.earnings}</strong></span>
        <span>Market Events <strong>{summary.market}</strong></span>
      </section>

      <section className="drCalendarControls">
        <div className="drCalendarTabs">
          {windows.map((windowItem) => (
            <button className={activeWindow === windowItem.key ? "active" : ""} key={windowItem.key} onClick={() => setActiveWindow(windowItem.key)} type="button">
              {windowItem.label}
            </button>
          ))}
        </div>
        <div className="drCalendarFilters">
          <label>
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DR, underlying, company, event..." />
          </label>
          <label>
            <span>Event Type</span>
            <select value={eventType} onChange={(event) => setEventType(event.target.value as (typeof eventTypes)[number])}>
              {eventTypes.map((item) => <option key={item} value={item}>{filterTypeLabel(item)}</option>)}
            </select>
          </label>
          <label>
            <span>Country</span>
            <select value={country} onChange={(event) => setCountry(event.target.value as (typeof countries)[number])}>
              {countries.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="drCalendarViewControl"><span>View</span><strong>Timeline</strong></div>
        </div>
      </section>

      <section className="drCalendarTimelineShell">
        <div className="drCalendarTimelineHead">
          <h2>Timeline</h2>
          <details className="drCalendarScopeHelp">
            <summary>What events are included?</summary>
            <div>
              <span>XD Date</span>
              <span>Payment Date</span>
              <span>Earnings</span>
              <span>New Listing</span>
              <span>Market Holiday</span>
              <span>Market Event</span>
            </div>
          </details>
        </div>
        <div className="drCalendarTimeline">
          {filteredEvents.length === 0 ? (
            <div className="drCalendarEmpty">No events matched this view.</div>
          ) : null}
          {filteredEvents.map((event) => (
            <article key={event.id}>
              <div className="drCalendarDate">
                <strong>{formatDate(event.date)}</strong>
                <span>{daysUntil(event.date)} days</span>
              </div>
              <div className="drCalendarEventCopy">
                <span className={`drCalendarType ${typeClass(event.type)}`}>{eventTypeLabel(event.type)}</span>
                <h3>{event.title}</h3>
                <p>{event.note}</p>
                <small>{event.drSymbol ?? event.underlying ?? event.country} · {event.country} · {event.assetType} / {event.theme}</small>
              </div>
              <div className="drCalendarActions">
                {event.drSymbol ? <Link href={`/dr-new/${event.drSymbol}`}>View</Link> : <button type="button">View</button>}
                {event.underlying && (event.type === "Earnings" || event.type === "Market Event") ? <Link href={`/dr-new/compare?underlying=${event.underlying}`}>Compare</Link> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
