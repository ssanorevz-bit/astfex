import dividendSource from "../../../../../KB/dr_dividends.json";
import { thaiDrBySymbol } from "./thai-drs";
import type { ThaiDrDividendEvent, UnderlyingDividendEvent } from "./types";

type DividendRecord = {
  amount?: string;
  currency?: string;
  ex_date?: string;
  record_date?: string;
  payment_date?: string;
  source?: string;
  title?: string;
  type?: string;
  url?: string;
  summary?: string;
};

const dividendMap = dividendSource as Record<string, DividendRecord[] | undefined>;
const today = "2026-06-02";

function parseAmountThb(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function eventStatus(xdDate: string | undefined, paymentDate: string | undefined): ThaiDrDividendEvent["status"] {
  if (xdDate && xdDate >= today) return "Upcoming XD";
  if (paymentDate && paymentDate >= today) return "Payment Soon";
  if (xdDate || paymentDate) return "Paid";
  return "Not Announced";
}

export const thaiDrDividendEvents: ThaiDrDividendEvent[] = Object.entries(dividendMap).flatMap(([drSymbol, events]) => {
  const dr = thaiDrBySymbol.get(drSymbol.toUpperCase());
  if (!dr || !events) return [];
  return events.map((event, index): ThaiDrDividendEvent => ({
    id: `${drSymbol}-${event.ex_date ?? event.payment_date ?? index}`,
    source: "Thai DR Dividend",
    drSymbol,
    underlyingSymbol: dr.underlyingSymbol,
    xdDate: event.ex_date ?? null,
    recordDate: event.record_date ?? null,
    paymentDate: event.payment_date ?? null,
    amountThb: parseAmountThb(event.amount),
    amountText: event.amount ?? null,
    currency: "THB",
    dividendType: event.type ?? event.title ?? null,
    status: eventStatus(event.ex_date, event.payment_date),
    sourceUrl: event.url ?? null,
    note: event.summary ?? event.source ?? null
  }));
}).sort((left, right) => (left.xdDate ?? left.paymentDate ?? "9999-12-31").localeCompare(right.xdDate ?? right.paymentDate ?? "9999-12-31"));

export const underlyingDividendEvents: UnderlyingDividendEvent[] = [];
