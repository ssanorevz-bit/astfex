import earningsSource from "../../../../../KB/underlying_earnings.json";
import { thaiDrDividendEvents } from "./dividend-events";
import { thaiDrs } from "./thai-drs";
import { normalizeUnderlyingSymbol } from "./underlying-aliases";
import { underlyingBySymbol } from "./underlyings";
import type { CalendarEvent } from "./types";

type EarningsRecord = {
  underlying_symbol?: string;
  earnings_date?: string;
  earnings_time?: string;
  fiscal_period?: string;
  eps_estimate?: string;
  revenue_estimate?: string;
  source_url?: string;
};

const earningsMap = earningsSource as Record<string, EarningsRecord[] | undefined>;
const leadDrByUnderlying = new Map<string, string>();
thaiDrs.forEach((dr) => {
  if (!leadDrByUnderlying.has(dr.underlyingSymbol)) leadDrByUnderlying.set(dr.underlyingSymbol, dr.symbol);
});

type SkippedEarningsEvent = {
  sourceSymbol: string;
  normalizedSymbol: string;
  earningsDate: string | null;
  reason: "invalid-symbol" | "missing-date" | "missing-underlying-join" | "missing-thai-dr-join";
};

const skippedEarningsEvents: SkippedEarningsEvent[] = [];

function skipEarningsEvent(
  sourceSymbol: string,
  normalizedSymbol: string,
  earningsDate: string | null,
  reason: SkippedEarningsEvent["reason"]
) {
  skippedEarningsEvents.push({
    sourceSymbol,
    normalizedSymbol,
    earningsDate,
    reason
  });
  return null;
}

const earningsEvents: CalendarEvent[] = Object.entries(earningsMap).flatMap(([sourceUnderlyingSymbol, events]) => {
  if (!events) return [];
  const underlyingSymbol = normalizeUnderlyingSymbol(sourceUnderlyingSymbol);
  return events.flatMap((event, index) => {
    const earningsDate = event.earnings_date ?? null;
    if (!underlyingSymbol || underlyingSymbol.toUpperCase() === "NULL") {
      skipEarningsEvent(sourceUnderlyingSymbol, underlyingSymbol, earningsDate, "invalid-symbol");
      return [];
    }
    if (!earningsDate) {
      skipEarningsEvent(sourceUnderlyingSymbol, underlyingSymbol, null, "missing-date");
      return [];
    }
    if (!underlyingBySymbol.has(underlyingSymbol.toUpperCase())) {
      skipEarningsEvent(sourceUnderlyingSymbol, underlyingSymbol, earningsDate, "missing-underlying-join");
      return [];
    }
    const drSymbol = leadDrByUnderlying.get(underlyingSymbol);
    if (!drSymbol) {
      skipEarningsEvent(sourceUnderlyingSymbol, underlyingSymbol, earningsDate, "missing-thai-dr-join");
      return [];
    }
    return [{
      id: `${underlyingSymbol}-earnings-${event.earnings_date}-${index}`,
      date: earningsDate,
      type: "Earnings",
      drSymbol,
      underlyingSymbol,
      title: `${underlyingSymbol} earnings`,
      note: [event.fiscal_period, event.earnings_time ? event.earnings_time.toUpperCase() : null].filter(Boolean).join(" · ") || null,
      source: "Underlying Earnings",
      sourceUrl: event.source_url ?? null
    }];
  });
});

const dividendCalendarEvents: CalendarEvent[] = thaiDrDividendEvents.flatMap((event) => {
  const rows: CalendarEvent[] = [];
  if (event.xdDate) {
    rows.push({
      id: `${event.id}-xd`,
      date: event.xdDate,
      type: "Dividend XD",
      drSymbol: event.drSymbol,
      underlyingSymbol: event.underlyingSymbol,
      title: `${event.drSymbol} XD date`,
      note: event.amountText,
      source: "Thai DR Dividend",
      sourceUrl: event.sourceUrl
    });
  }
  if (event.paymentDate) {
    rows.push({
      id: `${event.id}-payment`,
      date: event.paymentDate,
      type: "Dividend Payment",
      drSymbol: event.drSymbol,
      underlyingSymbol: event.underlyingSymbol,
      title: `${event.drSymbol} payment date`,
      note: event.amountText,
      source: "Thai DR Dividend",
      sourceUrl: event.sourceUrl
    });
  }
  return rows;
});

export const calendarEvents: CalendarEvent[] = [...dividendCalendarEvents, ...earningsEvents]
  .sort((left, right) => left.date.localeCompare(right.date));

export const calendarEventQa = {
  dividendCalendarEventCount: dividendCalendarEvents.length,
  earningsEventIncludedCount: earningsEvents.length,
  earningsEventSkippedCount: skippedEarningsEvents.length,
  skippedEarningsExamples: skippedEarningsEvents.slice(0, 20)
};
