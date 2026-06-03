"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CalendarEvent as SourceCalendarEvent } from "../data";
import { getSingleDrDetail } from "../data";

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

function createCalendarEvents(events: SourceCalendarEvent[]) {
  return events.map((event): CalendarEvent => {
    const row = event.drSymbol ? getSingleDrDetail(event.drSymbol) : null;
    const type = event.type === "Dividend XD" || event.type === "Dividend Payment" || event.type === "Earnings" ? event.type : "Market Event";
    return {
      id: event.id,
      date: event.date,
      type,
      drSymbol: event.drSymbol ?? undefined,
      underlying: event.underlyingSymbol,
      company: row?.company ?? event.underlyingSymbol,
      country: row?.region ?? "—",
      assetType: row?.assetType ?? "Source Market",
      theme: row?.theme ?? "Source Market",
      title: event.title,
      note: event.note ?? (event.source === "Thai DR Dividend" ? "Thai DR dividend event" : "Underlying earnings event"),
      priority: type === "Earnings" ? "High" : "Medium"
    };
  });
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

export function CalendarWorkspace({ events: sourceEvents }: { events: SourceCalendarEvent[] }) {
  const [activeWindow, setActiveWindow] = useState<CalendarWindow>("upcoming");
  const [eventType, setEventType] = useState<(typeof eventTypes)[number]>("All");
  const [country, setCountry] = useState<(typeof countries)[number]>("All");
  const [query, setQuery] = useState("");
  const events = useMemo(() => createCalendarEvents(sourceEvents), [sourceEvents]);

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
                <h3 className="drNameClamp" title={event.title}>{event.title}</h3>
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
