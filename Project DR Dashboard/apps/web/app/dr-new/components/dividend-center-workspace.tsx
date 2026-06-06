"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ThaiDrDividendEvent } from "../data";
import { getSingleDrDetail } from "../data";
import { getTaxonomyAssetType, getTaxonomyCountry, getTaxonomyPrimaryTheme, type DrAssetTypeFilter } from "../dr-taxonomy";
import { UnderlyingLogoMark } from "./underlying-logo-mark";

type DividendStatus = "Upcoming XD" | "Payment Soon" | "Paid" | "Not Yet Scheduled" | "No Recent Dividend";
type DividendSource = "DR Dividend" | "Underlying Dividend";
type DividendType = "Regular" | "Special" | "Monthly" | "Quarterly" | "Semi-Annual" | "Annual";
type DividendTab = "upcomingXd" | "paymentSoon" | "history" | "calendar";
type DividendWindowMode = "past" | "next30" | "yearAhead";
type DividendYearAheadBasis = "xd" | "payment";
type DividendCalendarCell = { iso: string; dayLabel: string; monthLabel?: string; muted: boolean; groups: DividendEventGroup[] };
type DividendMonthBucket = { key: string; label: string; groups: DividendEventGroup[]; drCount: number };
type DividendWindowMatrixRow = {
  key: string;
  underlyingSymbol: string;
  companyName: string;
  groups: DividendEventGroup[];
  eventCount: number;
  drCount: number;
};

type DividendEvent = {
  id: string;
  drSymbol: string;
  underlyingSymbol: string;
  companyName: string;
  country: string;
  assetType: DrAssetTypeFilter;
  theme: string;
  source: DividendSource;
  status: DividendStatus;
  dividendType: DividendType;
  frequency: "Monthly" | "Quarterly" | "Semi-Annual" | "Annual" | "Unknown";
  xdDate?: string;
  recordDate?: string;
  paymentDate?: string;
  amount?: number;
  currency: string;
  yieldPct?: number;
  lastXdDate?: string;
  lastPaymentDate?: string;
  nextExpected?: string;
  note: string;
};

type DividendEventGroup = {
  id: string;
  underlyingSymbol: string;
  companyName: string;
  country: string;
  assetType: DividendEvent["assetType"];
  theme: string;
  status: DividendStatus;
  dividendType: DividendType;
  frequency: DividendEvent["frequency"];
  xdDate?: string;
  paymentDate?: string;
  currency: string;
  yieldPct?: number;
  amountMin?: number;
  amountMax?: number;
  events: DividendEvent[];
  historyCount: number;
  upcomingCount: number;
  cadenceDays?: number;
  qualityLabel: string;
  qualityTone: "strong" | "balanced" | "watch";
  nextExpected?: string;
  nextExpectedKind: "scheduled" | "estimated" | "unknown";
  lastXdDate?: string;
  lastPaymentDate?: string;
};

type DividendUnderlyingIntelligence = {
  frequency: DividendEvent["frequency"];
  cadenceDays?: number;
  historyCount: number;
  upcomingCount: number;
  qualityLabel: string;
  qualityTone: "strong" | "balanced" | "watch";
  nextExpected?: string;
  nextExpectedKind: "scheduled" | "estimated" | "unknown";
  lastXdDate?: string;
  lastPaymentDate?: string;
};

const tabs: Array<{ key: DividendTab; label: string }> = [
  { key: "upcomingXd", label: "Upcoming XD" },
  { key: "paymentSoon", label: "Payment Soon" },
  { key: "history", label: "History" },
  { key: "calendar", label: "Calendar" }
];

const defaultSortByTab: Record<DividendTab, string> = {
  upcomingXd: "XD Date",
  paymentSoon: "Payment Date",
  history: "Payment Date",
  calendar: "Date"
};

const sortOptionsByTab: Record<DividendTab, string[]> = {
  upcomingXd: ["XD Date", "Payment Date", "Yield", "Amount", "DR A-Z"],
  paymentSoon: ["Payment Date", "XD Date", "Yield", "Amount", "DR A-Z"],
  history: ["XD Date", "Payment Date", "Amount", "Yield", "DR A-Z"],
  calendar: ["Date", "Event", "DR A-Z"]
};

function normalizeDividendEvents(events: ThaiDrDividendEvent[]): DividendEvent[] {
  return events.map((event) => {
    const row = getSingleDrDetail(event.drSymbol);
    return {
      id: event.id,
      drSymbol: event.drSymbol,
      underlyingSymbol: event.underlyingSymbol,
      companyName: row?.company ?? event.underlyingSymbol,
      country: row ? getTaxonomyCountry(row) : "—",
      assetType: row ? getTaxonomyAssetType(row) : "Stock",
      theme: row ? getTaxonomyPrimaryTheme(row) : "Other / Diversified",
      source: "DR Dividend",
      status: event.status === "Not Announced" ? "Not Yet Scheduled" : event.status,
      dividendType: "Regular",
      frequency: "Unknown",
      xdDate: event.xdDate ?? undefined,
      recordDate: event.recordDate ?? undefined,
      paymentDate: event.paymentDate ?? undefined,
      amount: event.amountThb ?? undefined,
      currency: event.currency,
      yieldPct: row?.dividendYield ?? undefined,
      note: event.note ?? "Thai DR dividend event"
    };
  });
}

function formatNumberAmount(value?: number) {
  if (value === undefined) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: value < 1 ? 3 : 2, maximumFractionDigits: value < 1 ? 3 : 2 });
}

function formatAmount(event: DividendEvent) {
  return formatNumberAmount(event.amount);
}

function formatThaiDrCount(count: number) {
  return `${count} Thai DR${count === 1 ? "" : "s"}`;
}

function formatAmountRange(group: DividendEventGroup) {
  if (group.amountMin === undefined) return "—";
  if (group.amountMax === undefined || group.amountMin === group.amountMax) return `${formatNumberAmount(group.amountMin)} ${group.currency}`;
  return `${formatNumberAmount(group.amountMin)}-${formatNumberAmount(group.amountMax)} ${group.currency}`;
}

function formatYieldValue(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  return `${value.toFixed(2)}%`;
}

function formatYieldLabel(group: DividendEventGroup) {
  return formatYieldValue(group.yieldPct) ?? "Yield —";
}

function formatYieldShort(group: DividendEventGroup) {
  return formatYieldValue(group.yieldPct) ?? "—";
}

function displayCountry(value: string) {
  if (value === "Other Asia") return "Singapore";
  return value;
}

function yieldClassName(value?: number) {
  if (value === undefined) return "muted";
  if (value >= 5) return "high";
  if (value >= 2) return "mid";
  return "low";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateValue(value?: string) {
  return value ?? "9999-12-31";
}

function parseIsoDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatReadableDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function addDays(value: string, days: number) {
  const parsed = parseIsoDate(value);
  if (!parsed) return undefined;
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function median(numbers: number[]) {
  if (!numbers.length) return undefined;
  const sorted = [...numbers].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2;
  return sorted[middle];
}

function uniqueSortedDates(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function inferFrequency(dates: string[]) {
  if (dates.length < 2) return { frequency: "Unknown" as const, cadenceDays: undefined };
  const diffs = dates
    .map((value, index) => {
      if (index === 0) return null;
      const current = parseIsoDate(value);
      const previous = parseIsoDate(dates[index - 1]);
      if (!current || !previous) return null;
      return Math.round((current.getTime() - previous.getTime()) / 86400000);
    })
    .filter((value): value is number => value !== null && value > 0);
  const midpoint = median(diffs);
  if (midpoint === undefined) return { frequency: "Unknown" as const, cadenceDays: undefined };
  if (midpoint >= 20 && midpoint <= 40) return { frequency: "Monthly" as const, cadenceDays: 30 };
  if (midpoint >= 70 && midpoint <= 110) return { frequency: "Quarterly" as const, cadenceDays: 91 };
  if (midpoint >= 150 && midpoint <= 220) return { frequency: "Semi-Annual" as const, cadenceDays: 182 };
  if (midpoint >= 300 && midpoint <= 420) return { frequency: "Annual" as const, cadenceDays: 365 };
  return { frequency: "Unknown" as const, cadenceDays: Math.round(midpoint) };
}

function buildUnderlyingDividendIntelligence(events: DividendEvent[]) {
  const grouped = new Map<string, DividendEvent[]>();
  for (const event of events) {
    const bucket = grouped.get(event.underlyingSymbol) ?? [];
    bucket.push(event);
    grouped.set(event.underlyingSymbol, bucket);
  }

  const today = todayIso();
  const payload = new Map<string, DividendUnderlyingIntelligence>();

  for (const [underlyingSymbol, rows] of grouped.entries()) {
    const xdDates = uniqueSortedDates(rows.map((event) => event.xdDate));
    const paymentDates = uniqueSortedDates(rows.map((event) => event.paymentDate));
    const pastXdDates = xdDates.filter((value) => value < today);
    const futureXdDates = xdDates.filter((value) => value >= today);
    const pastPaymentDates = paymentDates.filter((value) => value < today);
    const futurePaymentDates = paymentDates.filter((value) => value >= today);
    const historyAnchorDates = pastPaymentDates.length >= 2 ? pastPaymentDates : pastXdDates;
    const { frequency, cadenceDays } = inferFrequency(historyAnchorDates);
    const historyCount = historyAnchorDates.length;
    const upcomingCount = futureXdDates.length + futurePaymentDates.length;
    const lastXdDate = pastXdDates[pastXdDates.length - 1];
    const lastPaymentDate = pastPaymentDates[pastPaymentDates.length - 1];
    const nextScheduledDates = uniqueSortedDates([...futureXdDates, ...futurePaymentDates]);
    const nextScheduled = nextScheduledDates[0];
    const estimated = !nextScheduled && cadenceDays && (lastPaymentDate || lastXdDate)
      ? addDays(lastPaymentDate ?? lastXdDate!, cadenceDays)
      : undefined;

    let qualityLabel = "Await schedule";
    let qualityTone: DividendUnderlyingIntelligence["qualityTone"] = "watch";
    if (frequency !== "Unknown" && historyCount >= 3) {
      qualityLabel = "Established cadence";
      qualityTone = "strong";
    } else if (frequency !== "Unknown" && historyCount >= 2) {
      qualityLabel = "Developing cadence";
      qualityTone = "balanced";
    } else if (nextScheduled) {
      qualityLabel = "Event announced";
      qualityTone = "balanced";
    }

    payload.set(underlyingSymbol, {
      frequency,
      cadenceDays,
      historyCount,
      upcomingCount,
      qualityLabel,
      qualityTone,
      nextExpected: nextScheduled ?? estimated,
      nextExpectedKind: nextScheduled ? "scheduled" : estimated ? "estimated" : "unknown",
      lastXdDate,
      lastPaymentDate
    });
  }

  return payload;
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

function groupDividendEvents(events: DividendEvent[]) {
  const intelligenceByUnderlying = buildUnderlyingDividendIntelligence(events);
  const groups = new Map<string, DividendEventGroup>();
  for (const event of events) {
    const key = groupEventKey(event);
    const existing = groups.get(key);
    const intelligence = intelligenceByUnderlying.get(event.underlyingSymbol);
    if (existing) {
      existing.events.push(event);
      if (!existing.xdDate && event.xdDate) existing.xdDate = event.xdDate;
      if (!existing.paymentDate && event.paymentDate) existing.paymentDate = event.paymentDate;
      if (event.amount !== undefined) {
        existing.amountMin = existing.amountMin === undefined ? event.amount : Math.min(existing.amountMin, event.amount);
        existing.amountMax = existing.amountMax === undefined ? event.amount : Math.max(existing.amountMax, event.amount);
      }
      if (event.yieldPct !== undefined && (existing.yieldPct === undefined || event.yieldPct > existing.yieldPct)) {
        existing.yieldPct = event.yieldPct;
      }
      continue;
    }
    groups.set(key, {
      id: key,
      underlyingSymbol: event.underlyingSymbol,
      companyName: event.companyName,
      country: event.country,
      assetType: event.assetType,
      theme: event.theme,
      status: event.status,
      dividendType: event.dividendType,
      frequency: intelligence?.frequency ?? event.frequency,
      xdDate: event.xdDate,
      paymentDate: event.paymentDate,
      currency: event.currency,
      yieldPct: event.yieldPct,
      amountMin: event.amount,
      amountMax: event.amount,
      events: [event],
      historyCount: intelligence?.historyCount ?? 0,
      upcomingCount: intelligence?.upcomingCount ?? 0,
      cadenceDays: intelligence?.cadenceDays,
      qualityLabel: intelligence?.qualityLabel ?? "Await schedule",
      qualityTone: intelligence?.qualityTone ?? "watch",
      nextExpected: intelligence?.nextExpected,
      nextExpectedKind: intelligence?.nextExpectedKind ?? "unknown",
      lastXdDate: intelligence?.lastXdDate,
      lastPaymentDate: intelligence?.lastPaymentDate
    });
  }
  return Array.from(groups.values()).map((group) => ({
    ...group,
    events: sortEvents(group.events, "DR A-Z")
  }));
}

function groupSearchText(group: DividendEventGroup) {
  return [
    group.underlyingSymbol,
    group.companyName,
    group.theme,
    displayCountry(group.country),
    group.assetType,
    ...group.events.flatMap((event) => [event.drSymbol, event.note])
  ].join(" ").toLowerCase();
}

function sortGroups(groups: DividendEventGroup[], sortBy: string) {
  return [...groups].sort((left, right) => {
    if (sortBy === "Date") return dateValue(left.xdDate ?? left.paymentDate).localeCompare(dateValue(right.xdDate ?? right.paymentDate));
    if (sortBy === "Event") return left.status.localeCompare(right.status);
    if (sortBy === "Payment Date") return dateValue(left.paymentDate).localeCompare(dateValue(right.paymentDate));
    if (sortBy === "Yield") return (right.yieldPct ?? 0) - (left.yieldPct ?? 0);
    if (sortBy === "Amount") return (right.amountMax ?? 0) - (left.amountMax ?? 0);
    if (sortBy === "DR A-Z") return left.underlyingSymbol.localeCompare(right.underlyingSymbol);
    return dateValue(left.xdDate).localeCompare(dateValue(right.xdDate));
  });
}

function sortGroupsForTab(groups: DividendEventGroup[], sortBy: string, tab: DividendTab) {
  const sorted = sortGroups(groups, sortBy);
  if (tab === "history" && (sortBy === "XD Date" || sortBy === "Payment Date" || sortBy === "Date")) {
    const reversed = [...sorted].reverse();
    if (sortBy === "Payment Date" || sortBy === "Date") {
      const withPaymentDate = reversed.filter((group) => group.paymentDate);
      const withoutPaymentDate = reversed.filter((group) => !group.paymentDate);
      return [...withPaymentDate, ...withoutPaymentDate];
    }
    return reversed;
  }
  return sorted;
}

function uniqueGroupsByUnderlying(groups: DividendEventGroup[]) {
  const seen = new Set<string>();
  return groups.filter((group) => {
    if (seen.has(group.underlyingSymbol)) return false;
    seen.add(group.underlyingSymbol);
    return true;
  });
}

function qualityRank(group: DividendEventGroup) {
  if (group.qualityTone === "strong") return 0;
  if (group.qualityTone === "balanced") return 1;
  return 2;
}

function frequencyLabel(frequency: DividendEventGroup["frequency"]) {
  if (frequency === "Unknown") return "Unscored";
  return frequency;
}

function frequencyPlainLabel(frequency: DividendEventGroup["frequency"]) {
  if (frequency === "Monthly") return "Pays every month";
  if (frequency === "Quarterly") return "Pays every quarter";
  if (frequency === "Semi-Annual") return "Pays every 6 months";
  if (frequency === "Annual") return "Pays once a year";
  return "Dividend schedule pending";
}

function nextExpectedLabel(group: DividendEventGroup) {
  if (!group.nextExpected) return "Await schedule";
  const prefix = group.nextExpectedKind === "estimated" ? "Est." : "Scheduled";
  return `${prefix} ${formatShortDate(group.nextExpected)}`;
}

function cadenceWindowLabel(days?: number) {
  if (!days) return "Window unscored";
  if (days >= 20 && days <= 40) return "About 1 month";
  if (days >= 70 && days <= 110) return "About 1 quarter";
  if (days >= 150 && days <= 220) return "About 6 months";
  if (days >= 300 && days <= 420) return "About 1 year";
  return `About ${days} days`;
}

function historyInsightLabel(group: DividendEventGroup) {
  if (group.historyCount >= 1) return `Paid ${group.historyCount} time${group.historyCount === 1 ? "" : "s"}`;
  if (group.upcomingCount >= 1) return `${group.upcomingCount} upcoming dividend${group.upcomingCount === 1 ? "" : "s"}`;
  return "Waiting for schedule";
}

function groupCoverageLabel(group: DividendEventGroup) {
  return `${formatThaiDrCount(group.events.length)} on same underlying`;
}

function groupPatternLabel(group: DividendEventGroup) {
  if (group.frequency !== "Unknown") return frequencyPlainLabel(group.frequency);
  if (group.nextExpectedKind === "estimated" && group.nextExpected) return `Expected around ${formatShortDate(group.nextExpected)}`;
  if (group.nextExpectedKind === "scheduled" && group.nextExpected) return `Next dividend ${formatShortDate(group.nextExpected)}`;
  return "Waiting for next dividend";
}

function shortScheduleLabel(group: DividendEventGroup) {
  if (group.status === "Upcoming XD" && group.xdDate) return `XD ${formatShortDate(group.xdDate)}`;
  if (group.status === "Payment Soon" && group.paymentDate) return `Pay ${formatShortDate(group.paymentDate)}`;
  if (group.paymentDate) return `Paid ${formatShortDate(group.paymentDate)}`;
  if (group.xdDate) return `XD ${formatShortDate(group.xdDate)}`;
  return frequencyPlainLabel(group.frequency);
}

function compactCompanyNote(group: DividendEventGroup) {
  if (group.status === "Upcoming XD" && group.paymentDate) return `Pay ${formatShortDate(group.paymentDate)}`;
  if (group.status === "Payment Soon" && group.xdDate) return `XD ${formatShortDate(group.xdDate)}`;
  if (group.frequency !== "Unknown") return frequencyPlainLabel(group.frequency);
  return historyInsightLabel(group);
}

function daysFromToday(value?: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  const today = parseIsoDate(todayIso());
  if (!today) return null;
  return Math.round((parsed.getTime() - today.getTime()) / 86400000);
}

function formatWindowDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(`${value}-01T00:00:00`));
}

function groupAnchorDate(group: DividendEventGroup) {
  return group.xdDate ?? group.paymentDate ?? group.nextExpected;
}

function primaryEventDate(event: DividendEvent) {
  if (event.status === "Payment Soon") return event.paymentDate ?? event.xdDate;
  if (event.status === "Paid") return event.paymentDate ?? event.xdDate;
  if (event.status === "Upcoming XD") return event.xdDate ?? event.paymentDate;
  return event.xdDate ?? event.paymentDate ?? event.nextExpected;
}

function groupEventKey(event: DividendEvent) {
  return [event.underlyingSymbol, event.status, primaryEventDate(event) ?? "no-primary-date"].join("|");
}

function windowLabel(mode: DividendWindowMode, count: number, drCount = 0) {
  if (mode === "past") return `${count} recent windows`;
  if (mode === "next30") return `${count} windows in next 30 days`;
  return `${count} windows · ${drCount} Thai DRs`;
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addCalendarDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function mondayStart(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return date;
}

function sundayEnd(value: Date) {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? 0 : 7 - day));
  return date;
}

function buildNextThirtyCalendar(groups: DividendEventGroup[]): DividendCalendarCell[] {
  const today = parseIsoDate(todayIso());
  if (!today) return [];
  const end = addCalendarDays(today, 29);
  const first = mondayStart(today);
  const last = sundayEnd(end);
  const cells: DividendCalendarCell[] = [];
  for (let cursor = new Date(first); cursor <= last; cursor = addCalendarDays(cursor, 1)) {
    const iso = isoDate(cursor);
    cells.push({
      iso,
      dayLabel: String(cursor.getDate()),
      monthLabel: cursor.getDate() === 1 || iso === isoDate(first) ? formatWindowDate(iso).split(" ")[0] : undefined,
      muted: cursor < today || cursor > end,
      groups: groups.filter((group) => groupAnchorDate(group) === iso)
    });
  }
  return cells;
}

function monthKey(value?: string) {
  return value ? value.slice(0, 7) : "";
}

function groupWindowDate(group: DividendEventGroup, mode: "past" | "future", futureBasis: DividendYearAheadBasis = "xd") {
  if (mode === "past") return group.paymentDate ?? group.xdDate ?? group.lastPaymentDate;
  if (futureBasis === "payment") return group.paymentDate ?? group.nextExpected ?? groupAnchorDate(group);
  return group.nextExpected ?? group.xdDate ?? group.paymentDate ?? groupAnchorDate(group);
}

function bucketStart(monthOffset: number) {
  const today = parseIsoDate(todayIso());
  if (!today) return null;
  const current = new Date(today);
  current.setMonth(current.getMonth() + monthOffset);
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthBuckets(groups: DividendEventGroup[], mode: "past" | "future", futureBasis: DividendYearAheadBasis = "xd"): DividendMonthBucket[] {
  const start = mode === "past" ? -11 : 0;
  return Array.from({ length: 12 }, (_, index) => {
    const key = bucketStart(start + index) ?? "";
    const monthGroups = groups.filter((group) => monthKey(groupWindowDate(group, mode, futureBasis)) === key);
    return {
      key,
      label: formatMonthLabel(key),
      groups: monthGroups,
      drCount: monthGroups.reduce((total, group) => total + group.events.length, 0)
    };
  });
}

function buildWindowRows(groups: DividendEventGroup[], mode: "past" | "future", futureBasis: DividendYearAheadBasis = "xd"): DividendWindowMatrixRow[] {
  const rows = new Map<string, DividendWindowMatrixRow>();
  for (const group of groups) {
    const existing = rows.get(group.underlyingSymbol);
    if (existing) {
      existing.groups.push(group);
      existing.eventCount += 1;
      existing.drCount += group.events.length;
      continue;
    }
    rows.set(group.underlyingSymbol, {
      key: group.underlyingSymbol,
      underlyingSymbol: group.underlyingSymbol,
      companyName: group.companyName,
      groups: [group],
      eventCount: 1,
      drCount: group.events.length
    });
  }

  return Array.from(rows.values()).sort((left, right) => {
    const leftDates = left.groups.map((group) => groupWindowDate(group, mode, futureBasis)).filter((value): value is string => Boolean(value)).sort();
    const rightDates = right.groups.map((group) => groupWindowDate(group, mode, futureBasis)).filter((value): value is string => Boolean(value)).sort();
    const leftDate = mode === "past" ? leftDates[leftDates.length - 1] : leftDates[0];
    const rightDate = mode === "past" ? rightDates[rightDates.length - 1] : rightDates[0];
    if (leftDate && rightDate && leftDate !== rightDate) {
      return mode === "past" ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
    }
    return left.underlyingSymbol.localeCompare(right.underlyingSymbol);
  });
}

function matrixCellLabel(groups: DividendEventGroup[]) {
  if (!groups.length) return "·";
  const yields = groups
    .map((group) => group.yieldPct)
    .filter((value): value is number => value !== undefined && Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!yields.length) return groups.length === 1 ? "Yield —" : `${groups.length} yields`;
  if (yields.length === 1 || yields[0] === yields[yields.length - 1]) return formatYieldValue(yields[yields.length - 1]) ?? "Yield —";
  return `${formatYieldValue(yields[0])}-${formatYieldValue(yields[yields.length - 1])}`;
}

export function DividendCenterWorkspace({ events: sourceEvents }: { events: ThaiDrDividendEvent[] }) {
  const defaultWindowRows = 10;
  const defaultTableRows = 12;
  const [activeTab, setActiveTab] = useState<DividendTab>("upcomingXd");
  const [sortBy, setSortBy] = useState(defaultSortByTab.upcomingXd);
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedCalendarCells, setExpandedCalendarCells] = useState<Set<string>>(new Set());
  const [windowMode, setWindowMode] = useState<DividendWindowMode>("next30");
  const [yearAheadBasis, setYearAheadBasis] = useState<DividendYearAheadBasis>("xd");
  const [upcomingVisibleRows, setUpcomingVisibleRows] = useState(defaultTableRows);
  const [paymentVisibleRows, setPaymentVisibleRows] = useState(defaultTableRows);
  const [historyVisibleRows, setHistoryVisibleRows] = useState(defaultTableRows);
  const [calendarVisibleRows, setCalendarVisibleRows] = useState(defaultTableRows);
  const [pastVisibleRows, setPastVisibleRows] = useState(defaultWindowRows);
  const [yearAheadVisibleRows, setYearAheadVisibleRows] = useState(defaultWindowRows);
  const events = useMemo(() => normalizeDividendEvents(sourceEvents), [sourceEvents]);
  const groupedEvents = useMemo(() => groupDividendEvents(events), [events]);

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groupedEvents;
    return groupedEvents.filter((group) => groupSearchText(group).includes(normalized));
  }, [groupedEvents, query]);

  const upcomingXdGroups = sortGroupsForTab(filteredGroups.filter((group) => group.status === "Upcoming XD"), sortBy, "upcomingXd");
  const paymentSoonGroups = sortGroupsForTab(filteredGroups.filter((group) => group.status === "Payment Soon"), sortBy, "paymentSoon");
  const historyGroups = sortGroupsForTab(filteredGroups.filter((group) => group.status === "Paid"), sortBy, "history");
  const calendarGroups = sortGroupsForTab(filteredGroups.filter((group) => group.status === "Upcoming XD" || group.status === "Payment Soon"), sortBy, "calendar");
  const highestYieldGroups = uniqueGroupsByUnderlying(sortGroups(filteredGroups.filter((group) => group.yieldPct !== undefined), "Yield")).slice(0, 4);
  const windowYieldGroups = filteredGroups.filter((group) => group.yieldPct !== undefined);
  const consistentCadenceGroups = uniqueGroupsByUnderlying(
    [...filteredGroups]
      .filter((group) => group.qualityTone !== "watch")
      .sort((left, right) => {
        const rank = qualityRank(left) - qualityRank(right);
        if (rank !== 0) return rank;
        return (right.yieldPct ?? 0) - (left.yieldPct ?? 0);
      })
  ).slice(0, 4);
  const nextExpectedGroups = uniqueGroupsByUnderlying(
    [...filteredGroups]
      .filter((group) => group.nextExpected)
      .sort((left, right) => dateValue(left.nextExpected).localeCompare(dateValue(right.nextExpected)))
  ).slice(0, 4);
  const incomeEtfGroups = uniqueGroupsByUnderlying(sortGroups(filteredGroups.filter((group) => group.assetType === "ETF" || group.assetType === "Bond"), "Yield")).slice(0, 4);
  const heroGroup = useMemo(() => {
    const candidates = uniqueGroupsByUnderlying(
      [...filteredGroups]
        .filter((group) => group.yieldPct !== undefined && (group.status === "Upcoming XD" || group.status === "Payment Soon"))
        .sort((left, right) => {
          const leftDays = daysFromToday(groupAnchorDate(left)) ?? 9999;
          const rightDays = daysFromToday(groupAnchorDate(right)) ?? 9999;
          if (leftDays !== rightDays) return leftDays - rightDays;
          return (right.yieldPct ?? 0) - (left.yieldPct ?? 0);
        })
    );
    return candidates[0] ?? highestYieldGroups[0] ?? upcomingXdGroups[0] ?? paymentSoonGroups[0] ?? null;
  }, [filteredGroups, highestYieldGroups, upcomingXdGroups, paymentSoonGroups]);
  const timelineGroups = calendarGroups.slice(0, 8);
  const pastWindowGroups = sortGroupsForTab(
    windowYieldGroups.filter((group) => {
      if (group.status !== "Paid") return false;
      const days = daysFromToday(groupWindowDate(group, "past"));
      return days !== null && days >= -365 && days < 0;
    }),
    "Payment Date",
    "history"
  );
  const nextThirtyGroups = uniqueGroupsByUnderlying(
    [...calendarGroups].filter((group) => {
      if (group.yieldPct === undefined) return false;
      const days = daysFromToday(groupAnchorDate(group));
      return days !== null && days >= 0 && days <= 30;
    })
  );
  const yearAheadXdGroups = uniqueGroupsByUnderlying(
    [...windowYieldGroups]
      .filter((group) => {
        const days = daysFromToday(groupWindowDate(group, "future", "xd"));
        return days !== null && days >= 0 && days <= 365;
      })
      .sort((left, right) => dateValue(groupWindowDate(left, "future", "xd")).localeCompare(dateValue(groupWindowDate(right, "future", "xd"))))
  );
  const yearAheadPaymentGroups = uniqueGroupsByUnderlying(
    [...windowYieldGroups]
      .filter((group) => {
        const days = daysFromToday(groupWindowDate(group, "future", "payment"));
        return days !== null && days >= 0 && days <= 365;
      })
      .sort((left, right) => dateValue(groupWindowDate(left, "future", "payment")).localeCompare(dateValue(groupWindowDate(right, "future", "payment"))))
  );
  const yearAheadGroups = yearAheadBasis === "payment" ? yearAheadPaymentGroups : yearAheadXdGroups;
  const activeWindowGroups = windowMode === "past" ? pastWindowGroups : windowMode === "next30" ? nextThirtyGroups : yearAheadGroups;
  const nextThirtyCalendar = buildNextThirtyCalendar(nextThirtyGroups);
  const pastBuckets = buildMonthBuckets(pastWindowGroups, "past");
  const pastRows = buildWindowRows(pastWindowGroups, "past");
  const pastPeak = Math.max(...pastBuckets.map((bucket) => bucket.groups.length), 1);
  const pastDrCount = pastWindowGroups.reduce((total, group) => total + group.events.length, 0);
  const yearAheadBuckets = buildMonthBuckets(yearAheadGroups, "future", yearAheadBasis);
  const yearAheadPeak = Math.max(...yearAheadBuckets.map((bucket) => bucket.groups.length), 1);
  const yearAheadRows = buildWindowRows(yearAheadGroups, "future", yearAheadBasis);
  const yearAheadDrCount = yearAheadGroups.reduce((total, group) => total + group.events.length, 0);
  const visibleUpcomingGroups = upcomingXdGroups.slice(0, upcomingVisibleRows);
  const visiblePaymentGroups = paymentSoonGroups.slice(0, paymentVisibleRows);
  const visibleHistoryGroups = historyGroups.slice(0, historyVisibleRows);
  const visibleCalendarGroups = calendarGroups.slice(0, calendarVisibleRows);

  const summary = {
    upcomingXd: groupDividendEvents(events.filter((event) => event.status === "Upcoming XD")).length,
    upcomingPayment: groupDividendEvents(events.filter((event) => event.status === "Payment Soon")).length,
    highestYield: highestYieldGroups[0]?.yieldPct ?? null,
    highestYieldSymbol: highestYieldGroups[0]?.underlyingSymbol ?? "—",
    nextXdSymbol: upcomingXdGroups[0]?.underlyingSymbol ?? "—",
    establishedCadence: uniqueGroupsByUnderlying(filteredGroups.filter((group) => group.qualityTone === "strong")).length
  };

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function toggleCalendarCell(iso: string) {
    setExpandedCalendarCells((current) => {
      const next = new Set(current);
      if (next.has(iso)) {
        next.delete(iso);
      } else {
        next.add(iso);
      }
      return next;
    });
  }

  function resetWindowMode(nextMode: DividendWindowMode) {
    setWindowMode(nextMode);
    if (nextMode === "past") setPastVisibleRows(defaultWindowRows);
    if (nextMode === "yearAhead") setYearAheadVisibleRows(defaultWindowRows);
  }

  function resetActiveTab(nextTab: DividendTab) {
    setActiveTab(nextTab);
    setSortBy(defaultSortByTab[nextTab]);
    if (nextTab === "upcomingXd") setUpcomingVisibleRows(defaultTableRows);
    if (nextTab === "paymentSoon") setPaymentVisibleRows(defaultTableRows);
    if (nextTab === "history") setHistoryVisibleRows(defaultTableRows);
    if (nextTab === "calendar") setCalendarVisibleRows(defaultTableRows);
  }

  const activeTabCount = activeTab === "upcomingXd"
    ? upcomingXdGroups.length
    : activeTab === "paymentSoon"
      ? paymentSoonGroups.length
      : activeTab === "history"
        ? historyGroups.length
        : calendarGroups.length;
  const activeVisibleCount = activeTab === "upcomingXd"
    ? visibleUpcomingGroups.length
    : activeTab === "paymentSoon"
      ? visiblePaymentGroups.length
      : activeTab === "history"
        ? visibleHistoryGroups.length
        : visibleCalendarGroups.length;

  function expandActiveTab() {
    if (activeTab === "upcomingXd") setUpcomingVisibleRows((current) => current + defaultTableRows);
    if (activeTab === "paymentSoon") setPaymentVisibleRows((current) => current + defaultTableRows);
    if (activeTab === "history") setHistoryVisibleRows((current) => current + defaultTableRows);
    if (activeTab === "calendar") setCalendarVisibleRows((current) => current + defaultTableRows);
  }

  function collapseActiveTab() {
    if (activeTab === "upcomingXd") setUpcomingVisibleRows(defaultTableRows);
    if (activeTab === "paymentSoon") setPaymentVisibleRows(defaultTableRows);
    if (activeTab === "history") setHistoryVisibleRows(defaultTableRows);
    if (activeTab === "calendar") setCalendarVisibleRows(defaultTableRows);
  }

  return (
    <div className="drDividendCenter">
      <section className="drDividendSummary" aria-label="Dividend summary">
        <div>
          <span>Next XD</span>
          <strong>{summary.upcomingXd}</strong>
          <small>{summary.nextXdSymbol} this week</small>
        </div>
        <div>
          <span>Upcoming</span>
          <strong>{summary.upcomingPayment}</strong>
          <small>Payments coming up</small>
        </div>
        <div>
          <span>Highest Yield</span>
          <strong>{summary.highestYield === null ? "—" : `${summary.highestYield.toFixed(1)}%`}</strong>
          <small>{summary.highestYieldSymbol}</small>
        </div>
        <div>
          <span>Consistent Payers</span>
          <strong>{summary.establishedCadence}</strong>
          <small>Repeat dividend names</small>
        </div>
      </section>

      <section className="drDividendFilters">
        <span className="drDividendUpdated">Updated after latest market close · 16:35 ICT</span>
        <div className="drDividendToolbar">
          <div className="drDividendSearch">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search DR, underlying, company..." />
          </div>
        </div>
      </section>

      {heroGroup ? (
        <section className="drDividendHero" aria-label="Top dividend this week">
          <div className="drDividendHeroIntro">
            <span>Top Dividend This Week</span>
            <strong className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={heroGroup.underlyingSymbol} />{heroGroup.underlyingSymbol}</strong>
            <p>{heroGroup.companyName}</p>
          </div>
          <div className="drDividendHeroStats">
            <article>
              <span>Yield</span>
              <strong>{formatYieldShort(heroGroup)}</strong>
            </article>
            <article>
              <span>XD Date</span>
              <strong>{formatShortDate(heroGroup.xdDate)}</strong>
            </article>
            <article>
              <span>Pay Date</span>
              <strong>{formatShortDate(heroGroup.paymentDate)}</strong>
            </article>
            <article>
              <span>Frequency</span>
              <strong>{heroGroup.frequency === "Unknown" ? "Pending" : heroGroup.frequency}</strong>
            </article>
          </div>
          <div className="drDividendHeroMeta">
            <em>{groupCoverageLabel(heroGroup)}</em>
            <span>{groupPatternLabel(heroGroup)}</span>
          </div>
        </section>
      ) : null}

      <section className="drDividendRankings" aria-label="Dividend rankings">
        <DividendRankingCard title="Top Yield" groups={highestYieldGroups} subtitle={(group) => shortScheduleLabel(group)} highlight={(group) => formatYieldShort(group)} />
        <DividendRankingCard title="Upcoming XD" groups={uniqueGroupsByUnderlying(upcomingXdGroups).slice(0, 4)} subtitle={(group) => `${formatYieldShort(group)} Yield`} highlight={(group) => `XD ${formatShortDate(group.xdDate)}`} />
        <DividendRankingCard title="Dividend ETFs" groups={incomeEtfGroups} subtitle={(group) => shortScheduleLabel(group)} highlight={(group) => formatYieldShort(group)} />
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
                onClick={() => resetActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="drDividendSortPills" role="tablist" aria-label="Dividend sort options">
            {sortOptionsByTab[activeTab].map((item) => (
              <button type="button" className={sortBy === item ? "active" : ""} onClick={() => setSortBy(item)} key={item}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "upcomingXd" ? <DividendEventTable groups={visibleUpcomingGroups} expandedGroups={expandedGroups} onToggleGroup={toggleGroup} /> : null}
        {activeTab === "paymentSoon" ? <DividendEventTable groups={visiblePaymentGroups} expandedGroups={expandedGroups} onToggleGroup={toggleGroup} /> : null}
        {activeTab === "history" ? <HistoryTable groups={visibleHistoryGroups} expandedGroups={expandedGroups} onToggleGroup={toggleGroup} /> : null}
        {activeTab === "calendar" ? <CalendarTable groups={visibleCalendarGroups} timelineGroups={timelineGroups} expandedGroups={expandedGroups} onToggleGroup={toggleGroup} /> : null}
        {activeTabCount > defaultTableRows ? (
          <div className="drDividendMatrixActions">
            {activeVisibleCount < activeTabCount ? <button type="button" onClick={expandActiveTab}>See more</button> : <button type="button" onClick={collapseActiveTab}>Show less</button>}
            <span>Showing {activeVisibleCount} of {activeTabCount} rows</span>
          </div>
        ) : null}
      </section>

      <section className="drDividendDeskGrid" aria-label="Dividend desk insights">
        <article className="drDividendDeskCard drDividendDeskWindow">
          <div className="drDividendDeskHeader">
            <div>
              <span>Dividend Windows</span>
              <strong>{windowLabel(windowMode, activeWindowGroups.length, windowMode === "past" ? pastDrCount : yearAheadDrCount)}</strong>
            </div>
            <div className="drDividendDeskControls">
              <div className="drDividendSegmented" role="tablist" aria-label="Dividend windows">
                <button type="button" className={windowMode === "past" ? "active" : ""} onClick={() => resetWindowMode("past")}>Past</button>
                <button type="button" className={windowMode === "next30" ? "active" : ""} onClick={() => resetWindowMode("next30")}>Next 30 Days</button>
                <button type="button" className={windowMode === "yearAhead" ? "active" : ""} onClick={() => resetWindowMode("yearAhead")}>Year Ahead</button>
              </div>
              {windowMode === "yearAhead" ? (
                <div className="drDividendSegmented secondary" role="tablist" aria-label="Year ahead basis">
                  <button type="button" className={yearAheadBasis === "xd" ? "active" : ""} onClick={() => setYearAheadBasis("xd")}>XD Date</button>
                  <button type="button" className={yearAheadBasis === "payment" ? "active" : ""} onClick={() => setYearAheadBasis("payment")}>Payment Date</button>
                </div>
              ) : null}
            </div>
          </div>
          {windowMode === "past" ? <WindowMatrixView title="Past 12 months" buckets={pastBuckets} peak={pastPeak} rows={pastRows} mode="past" visibleRows={pastVisibleRows} onShowMore={() => setPastVisibleRows((current) => current + defaultWindowRows)} onShowLess={() => setPastVisibleRows(defaultWindowRows)} /> : null}
          {windowMode === "next30" ? <NextThirtyDividendCalendar cells={nextThirtyCalendar} expandedCells={expandedCalendarCells} onToggleCell={toggleCalendarCell} /> : null}
          {windowMode === "yearAhead" ? <WindowMatrixView title="Next 12 months" buckets={yearAheadBuckets} peak={yearAheadPeak} rows={yearAheadRows} mode="future" basis={yearAheadBasis} visibleRows={yearAheadVisibleRows} onShowMore={() => setYearAheadVisibleRows((current) => current + defaultWindowRows)} onShowLess={() => setYearAheadVisibleRows(defaultWindowRows)} /> : null}
        </article>
      </section>
    </div>
  );
}

function NextThirtyDividendCalendar({
  cells,
  expandedCells,
  onToggleCell
}: {
  cells: DividendCalendarCell[];
  expandedCells: Set<string>;
  onToggleCell: (iso: string) => void;
}) {
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="drDividendIncomeCalendar">
      <div className="drDividendCalendarHeader">
        {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="drDividendCalendarGrid">
        {cells.map((cell) => (
          <div className={cell.muted ? "muted" : ""} key={cell.iso}>
            <time>{cell.monthLabel ? `${cell.monthLabel} ${cell.dayLabel}` : cell.dayLabel}</time>
            <div>
              {(expandedCells.has(cell.iso) ? cell.groups : cell.groups.slice(0, 3)).map((group) => (
                <Link href={`/dr-new/${group.events[0]?.drSymbol ?? group.underlyingSymbol}`} key={`calendar-${cell.iso}-${group.id}`}>
                  <strong>{formatYieldLabel(group)}</strong>
                  <span className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={group.underlyingSymbol} className="compact" />{group.underlyingSymbol}</span>
                </Link>
              ))}
              {cell.groups.length > 3 ? (
                <button type="button" className="drDividendCalendarMore" onClick={() => onToggleCell(cell.iso)}>
                  {expandedCells.has(cell.iso) ? "Show less" : `+${cell.groups.length - 3} more`}
                </button>
              ) : null}
              {expandedCells.has(cell.iso) ? (
                <div className="drDividendCalendarDetail">
                  {cell.groups.map((group) => (
                    <article key={`calendar-detail-${cell.iso}-${group.id}`}>
                      <strong className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={group.underlyingSymbol} className="compact" />{group.underlyingSymbol}</strong>
                      <span>{formatYieldLabel(group)} · {groupCoverageLabel(group)}</span>
                      <em>XD {formatShortDate(group.xdDate)} · Pay {formatShortDate(group.paymentDate)}</em>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WindowMatrixView({
  title,
  buckets,
  peak,
  rows,
  mode,
  basis,
  visibleRows,
  onShowMore,
  onShowLess
}: {
  title: string;
  buckets: DividendMonthBucket[];
  peak: number;
  rows: DividendWindowMatrixRow[];
  mode: "past" | "future";
  basis?: DividendYearAheadBasis;
  visibleRows: number;
  onShowMore: () => void;
  onShowLess: () => void;
}) {
  const visibleBuckets = buckets;
  const totalWindows = buckets.reduce((total, bucket) => total + bucket.groups.length, 0);
  const visibleMatrixRows = rows.slice(0, visibleRows);
  const hasMoreRows = rows.length > visibleMatrixRows.length;
  return (
    <div className="drDividendYearAhead">
      <div className="drDividendYearAheadSummary">
        <strong>{totalWindows} dividend windows</strong>
        <span>{buckets.reduce((total, bucket) => total + bucket.drCount, 0)} Thai DR listings · {title}{mode === "future" ? ` · ${basis === "payment" ? "Payment date" : "XD date"}` : ""}</span>
      </div>
      <div className="drDividendYearBars" aria-label="Year ahead dividend windows by month">
        {visibleBuckets.map((bucket) => (
          <div key={bucket.key}>
            <span>{bucket.groups.length || "0"}</span>
            <div><i style={{ height: `${Math.max((bucket.groups.length / peak) * 100, bucket.groups.length ? 18 : 8)}%` }} /></div>
            <strong>{bucket.label}</strong>
          </div>
        ))}
      </div>
      <div className="drDividendYearMatrix">
        <div className="header">
          <span>Underlying</span>
          {visibleBuckets.map((bucket) => <span key={`head-${bucket.key}`}>{bucket.label}</span>)}
          <span>Total</span>
        </div>
        {visibleMatrixRows.map((group) => (
          <Link href={`/dr-new/${group.groups[0]?.events[0]?.drSymbol ?? group.underlyingSymbol}`} key={`matrix-${mode}-${group.key}`}>
            <strong className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={group.underlyingSymbol} className="compact" />{group.underlyingSymbol}</strong>
            {visibleBuckets.map((bucket) => {
              const matches = group.groups.filter((row) => monthKey(groupWindowDate(row, mode, basis)) === bucket.key);
              return <span className={matches.length ? "active" : ""} key={`${group.key}-${bucket.key}`}>{matrixCellLabel(matches)}</span>;
            })}
            <em>{group.eventCount} windows · {formatThaiDrCount(group.drCount)}</em>
          </Link>
        ))}
      </div>
      {rows.length > 10 ? (
        <div className="drDividendMatrixActions">
          {hasMoreRows ? <button type="button" onClick={onShowMore}>See more</button> : <button type="button" onClick={onShowLess}>Show less</button>}
          <span>Showing {visibleMatrixRows.length} of {rows.length} underlying names</span>
        </div>
      ) : null}
    </div>
  );
}

function DividendYieldBadge({ value }: { value?: number }) {
  return <span className={`drDividendYield ${yieldClassName(value)}`}>{value === undefined ? "—" : `${value.toFixed(2)}%`}</span>;
}

function DividendRankingCard({
  title,
  groups,
  subtitle,
  highlight
}: {
  title: string;
  groups: DividendEventGroup[];
  subtitle: (group: DividendEventGroup) => string;
  highlight: (group: DividendEventGroup) => string;
}) {
  return (
    <article>
      <h3>{title}</h3>
      {groups.length ? groups.map((group) => (
        <Link href={`/dr-new/${group.events[0]?.drSymbol ?? group.underlyingSymbol}`} key={`${title}-${group.id}`}>
          <strong className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={group.underlyingSymbol} className="compact" />{group.underlyingSymbol}</strong>
          <span>{subtitle(group)}</span>
          <em>{highlight(group)}</em>
        </Link>
      )) : <p>No data yet</p>}
    </article>
  );
}

function StatusBadge({ status }: { status: DividendStatus }) {
  const label = status === "Not Yet Scheduled" ? "Not Announced" : status;
  return <span className={`drDividendStatus ${status.toLowerCase().replaceAll(" ", "-")}`}>{label}</span>;
}

function EmptyState() {
  return <div className="drDividendEmpty">No announced Thai DR dividend yet.</div>;
}

function DividendEventTable({
  groups,
  expandedGroups,
  onToggleGroup
}: {
  groups: DividendEventGroup[];
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
}) {
  if (!groups.length) return <EmptyState />;
  return (
    <div className="drDividendTable upcoming">
      <div className="header"><span>Underlying</span><span>Yield</span><span>XD Date</span><span>Payment Date</span><span>Company</span><span>Frequency</span><span>Thai DRs</span></div>
      {groups.map((group) => (
        <DividendGroupRows group={group} expanded={expandedGroups.has(group.id)} onToggle={() => onToggleGroup(group.id)} key={group.id} />
      ))}
    </div>
  );
}

function HistoryTable({
  groups,
  expandedGroups,
  onToggleGroup
}: {
  groups: DividendEventGroup[];
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
}) {
  if (!groups.length) return <EmptyState />;
  return (
    <div className="drDividendTable history">
      <div className="header"><span>Underlying</span><span>Yield</span><span>XD Date</span><span>Payment Date</span><span>Company</span><span>Frequency</span><span>Thai DRs</span></div>
      {groups.map((group) => (
        <DividendGroupRows group={group} expanded={expandedGroups.has(group.id)} onToggle={() => onToggleGroup(group.id)} showType key={group.id} />
      ))}
    </div>
  );
}

function DividendGroupRows({ group, expanded, onToggle, showType = false }: { group: DividendEventGroup; expanded: boolean; onToggle: () => void; showType?: boolean }) {
  return (
    <>
      <button type="button" className="drDividendGroupRow" aria-expanded={expanded} onClick={onToggle}>
        <strong><span className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={group.underlyingSymbol} className="compact" />{group.underlyingSymbol}</span><small>{displayCountry(group.country)} · {group.assetType.replace(" DR", "")}</small></strong>
        <DividendYieldBadge value={group.yieldPct} />
        <span>{formatReadableDate(group.xdDate)}</span>
        <span>{formatReadableDate(group.paymentDate)}</span>
        <span className="drDividendCompanyCell">
          <span className="drNameClamp" title={group.companyName}>{group.companyName}</span>
          <small className={`drDividendIntelCopy ${group.qualityTone}`}>{compactCompanyNote(group)}</small>
        </span>
        <span>{frequencyPlainLabel(group.frequency)}</span>
        <span className="drDividendListingCount">{formatThaiDrCount(group.events.length)}</span>
      </button>
      {expanded ? <DividendListingsPanel group={group} /> : null}
    </>
  );
}

function DividendListingsPanel({ group }: { group: DividendEventGroup }) {
  const primaryEvent = group.events[0];
  const frequencyLabel = group.frequency === "Unknown" ? "Pending" : group.frequency;
  return (
    <div className="drDividendListingsPanel">
      <section className="drDividendListingLeft">
        <div className="drDividendListingHeader">
          <div className="drDividendListingHead">
            <strong>{group.companyName} ({group.underlyingSymbol})</strong>
            <span>{displayCountry(group.country)} · {group.assetType.replace(" DR", "")}</span>
          </div>
          <span className="drDividendListingTicker">{group.underlyingSymbol}</span>
        </div>

        <div className="drDividendMetricGrid">
          <article className="primary">
            <strong>{formatYieldShort(group)}</strong>
            <span>Dividend Yield</span>
          </article>
          <article>
            <strong>{formatShortDate(group.xdDate)}</strong>
            <span>XD Date</span>
          </article>
          <article>
            <strong>{formatShortDate(group.paymentDate)}</strong>
            <span>Payment Date</span>
          </article>
          <article>
            <strong>{frequencyLabel}</strong>
            <span>Frequency</span>
          </article>
        </div>
      </section>

      <section className="drDividendTimelinePanel">
        <div className="drDividendListingTableHead">
          <strong>Dividend Timeline</strong>
        </div>
        <div className="drDividendTimelineSteps">
          <article className="active">
            <i>XD</i>
            <span>XD Date</span>
            <strong>{formatShortDate(group.xdDate)}</strong>
          </article>
          <article>
            <i>RD</i>
            <span>Record Date</span>
            <strong>{formatShortDate(primaryEvent?.recordDate)}</strong>
          </article>
          <article>
            <i>PAY</i>
            <span>Payment Date</span>
            <strong>{formatShortDate(group.paymentDate)}</strong>
          </article>
        </div>
      </section>

      <section className="drDividendListingTableWrap">
        <div className="drDividendListingTableHead">
          <strong>Available Thai DR Listings</strong>
          <span>{group.underlyingSymbol}</span>
        </div>
        <div className="drDividendListingRows">
          <div className="header"><span>DR</span><span>Issuer</span><span>Amount / DR</span><span>Payment Date</span></div>
          {group.events.map((event) => {
            const row = getSingleDrDetail(event.drSymbol);
            return (
              <Link href={`/dr-new/${event.drSymbol}`} key={event.id}>
                <strong>{event.drSymbol}</strong>
                <span>{row?.issuer ?? "—"}</span>
                <span>{formatAmount(event)} {event.currency}</span>
                <span>{formatReadableDate(event.paymentDate)}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="drDividendTimelineNote">
        <strong>i</strong>
        <span>You must hold shares before the XD date to be eligible for this dividend.</span>
      </div>

      <div className="drDividendListingFooter">
        <article>
          <span>Dividend Payout History</span>
          <strong>{historyInsightLabel(group)}</strong>
        </article>
        <article>
          <span>Next Dividend Date</span>
          <strong>{group.nextExpected ? formatShortDate(group.nextExpected) : formatShortDate(group.xdDate)}</strong>
        </article>
        <article>
          <span>Underlying Type</span>
          <strong>{displayCountry(group.country)} · {group.assetType.replace(" DR", "")}</strong>
        </article>
      </div>
    </div>
  );
}

function DividendQualityBadge({ label, tone }: { label: string; tone: DividendEventGroup["qualityTone"] }) {
  return <span className={`drDividendQuality ${tone}`}>{label}</span>;
}

function CalendarTable({
  groups,
  timelineGroups,
  expandedGroups,
  onToggleGroup
}: {
  groups: DividendEventGroup[];
  timelineGroups: DividendEventGroup[];
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
}) {
  const calendarRows = groups.flatMap((group) => [
    group.xdDate ? { group, date: group.xdDate, eventLabel: "XD Date" } : null,
    group.paymentDate ? { group, date: group.paymentDate, eventLabel: "Payment Date" } : null
  ]).filter((item): item is { group: DividendEventGroup; date: string; eventLabel: string } => item !== null)
    .sort((left, right) => left.date.localeCompare(right.date));

  if (!calendarRows.length) return <EmptyState />;
  return (
    <>
      <div className="drDividendTimeline" aria-label="Dividend mini timeline">
        {timelineGroups.map((group) => (
          <Link href={`/dr-new/${group.events[0]?.drSymbol ?? group.underlyingSymbol}`} key={`timeline-${group.id}`}>
            <time>{group.xdDate ?? group.paymentDate ?? "—"}</time>
            <strong className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={group.underlyingSymbol} className="compact" />{group.underlyingSymbol}</strong>
            <span>{formatThaiDrCount(group.events.length)} · {group.status}</span>
          </Link>
        ))}
      </div>
      <div className="drDividendTable calendar">
        <div className="header"><span>Date</span><span>Event</span><span>Underlying</span><span>Company / Fund</span><span>Thai DRs</span><span>Status</span></div>
        {calendarRows.map((item) => (
          <button type="button" className="drDividendGroupRow" aria-expanded={expandedGroups.has(item.group.id)} onClick={() => onToggleGroup(item.group.id)} key={`${item.group.id}-${item.eventLabel}`}>
            <span>{item.date}</span>
            <span>{item.eventLabel}</span>
            <strong className="drDividendSymbolWithLogo"><UnderlyingLogoMark symbol={item.group.underlyingSymbol} className="compact" />{item.group.underlyingSymbol}</strong>
            <span className="drNameClamp" title={item.group.companyName}>{item.group.companyName}</span>
            <span className="drDividendListingCount">{formatThaiDrCount(item.group.events.length)}</span>
            <StatusBadge status={item.group.status} />
          </button>
        ))}
      </div>
    </>
  );
}
