"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CalendarEvent as SourceCalendarEvent } from "../data";
import { getSingleDrDetail, getThaiDrsByUnderlying } from "../data";
import { UnderlyingLogoMark } from "./underlying-logo-mark";

type CalendarEventType = "Dividend XD" | "Dividend Payment" | "Earnings" | "New DR Listing" | "Market Event";
type CalendarWindow = "upcoming" | "month" | "earnings";
type EarningsSortMode = "actionable" | "newest" | "biggestBeat" | "biggestMove";
type EarningsResultFilter = "all" | "winners" | "inLine" | "losers";
type EarningsFocusMode = "upcoming" | "reported";

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
  yieldPct?: number;
  earningsTime?: string;
  fiscalPeriod?: string;
  epsEstimate?: string;
  revenueEstimate?: string;
  epsActual?: string;
  epsSurprisePct?: string;
  post1dMovePct?: number;
  post2dMovePct?: number;
  beatMissLabel?: string;
  guidanceLabel?: string;
  reactionPath?: string;
  reactionConfidence?: string;
  reactionUrgency?: string;
  thaiDrAngle?: string;
  aiSummary?: string;
  transcriptSummary?: string;
  transcriptStatus?: string;
  transcriptAvailable?: boolean;
  transcriptTakeawaysTh?: string[];
  managementFocusTh?: string;
  analystFocusTh?: string;
  transcriptTopics?: string[];
  drListingCount?: number;
  issuerCount?: number;
  mostLiquidDr?: string;
  mostLiquidDrValueThbM?: number;
  actionabilityScore?: number;
  filingConfirmed?: boolean;
  filingDate?: string;
  filingUrl?: string;
  priority: "High" | "Medium" | "Low";
};

type GroupedCalendarDate = {
  date: string;
  label: string;
  relativeLabel: string;
  events: CalendarEvent[];
};

type ThaiDrAngleSignal = {
  label: string;
  tone: "strong" | "balanced" | "watch";
};

type ThaiDrAngle = {
  headline: string;
  body: string;
  thesis: string;
  reactionPath: string;
  reactionConfidence: {
    label: string;
    tone: "strong" | "balanced" | "watch";
  };
  reactionUrgency: {
    label: string;
    tone: "strong" | "balanced" | "watch";
  };
  signals: ThaiDrAngleSignal[];
};

const eventTypes = ["All", "Dividend XD", "Dividend Payment", "Earnings"] as const;
const countries = ["All", "US", "Hong Kong", "China", "Japan", "Vietnam", "Singapore"] as const;
const windows: Array<{ key: CalendarWindow; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "month", label: "This Month" },
  { key: "earnings", label: "Earnings" }
];
const earningsSortModes: Array<{ key: EarningsSortMode; label: string }> = [
  { key: "actionable", label: "Most Actionable" },
  { key: "newest", label: "Newest" },
  { key: "biggestBeat", label: "Biggest Beat" },
  { key: "biggestMove", label: "Biggest Move" }
];
const earningsResultFilters: Array<{ key: EarningsResultFilter; label: string }> = [
  { key: "all", label: "All Results" },
  { key: "winners", label: "Winners" },
  { key: "inLine", label: "In Line" },
  { key: "losers", label: "Losers" }
];
const earningsFocusModes: Array<{ key: EarningsFocusMode; label: string }> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "reported", label: "Reported" }
];

function createCalendarEvents(events: SourceCalendarEvent[]) {
  return events.flatMap((event): CalendarEvent[] => {
    const row = event.drSymbol ? getSingleDrDetail(event.drSymbol) : null;
    const type = event.type === "Dividend XD" || event.type === "Dividend Payment" || event.type === "Earnings" || event.type === "New DR Listing"
      ? event.type
      : "Market Event";
    if (type === "Market Event" && event.title.toLowerCase().includes("holiday")) return [];

    return [{
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
      yieldPct: row?.dividendYield ?? undefined,
      earningsTime: event.earningsTime ?? undefined,
      fiscalPeriod: event.fiscalPeriod ?? undefined,
      epsEstimate: event.epsEstimate ?? undefined,
      revenueEstimate: event.revenueEstimate ?? undefined,
      epsActual: event.epsActual ?? undefined,
      epsSurprisePct: event.epsSurprisePct ?? undefined,
      post1dMovePct: event.post1dMovePct ?? undefined,
      post2dMovePct: event.post2dMovePct ?? undefined,
      beatMissLabel: event.beatMissLabel ?? undefined,
      guidanceLabel: event.guidanceLabel ?? undefined,
      reactionPath: event.reactionPath ?? undefined,
      reactionConfidence: event.reactionConfidence ?? undefined,
      reactionUrgency: event.reactionUrgency ?? undefined,
      thaiDrAngle: event.thaiDrAngle ?? undefined,
      aiSummary: event.aiSummary ?? undefined,
      transcriptSummary: event.transcriptSummary ?? undefined,
      transcriptStatus: event.transcriptStatus ?? undefined,
      transcriptAvailable: event.transcriptAvailable ?? undefined,
      transcriptTakeawaysTh: event.transcriptTakeawaysTh ?? undefined,
      managementFocusTh: event.managementFocusTh ?? undefined,
      analystFocusTh: event.analystFocusTh ?? undefined,
      transcriptTopics: event.transcriptTopics ?? undefined,
      drListingCount: event.drListingCount ?? undefined,
      issuerCount: event.issuerCount ?? undefined,
      mostLiquidDr: event.mostLiquidDr ?? undefined,
      mostLiquidDrValueThbM: event.mostLiquidDrValueThbM ?? undefined,
      actionabilityScore: event.actionabilityScore ?? undefined,
      filingConfirmed: event.filingConfirmed ?? undefined,
      filingDate: event.filingDate ?? undefined,
      filingUrl: event.filingUrl ?? undefined,
      priority: type === "Earnings" ? "High" : type === "Dividend Payment" ? "Medium" : "Low"
    }];
  });
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysUntil(date: string) {
  const today = startOfToday();
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function relativeDayLabel(date: string) {
  const delta = daysUntil(date);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta > 1) return `In ${delta} days`;
  return `${Math.abs(delta)} days ago`;
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
  if (type === "All") return "All Events";
  return eventTypeLabel(type);
}

function eventLink(event: CalendarEvent) {
  if (event.drSymbol) return `/dr-new/${event.drSymbol}`;
  if (event.underlying) return `/dr-new/compare?underlying=${event.underlying}`;
  return null;
}

function showDividendYield(event: CalendarEvent) {
  return (event.type === "Dividend XD" || event.type === "Dividend Payment") && event.yieldPct !== undefined;
}

function parseNullableNumber(value?: string) {
  if (!value) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatEarningsSession(value?: string) {
  if (!value) return null;
  if (value.toLowerCase() === "amc") return "After market";
  if (value.toLowerCase() === "bmo") return "Before market";
  return value.toUpperCase();
}

function formatEpsValue(value?: string) {
  const numeric = parseNullableNumber(value);
  if (numeric === null) return null;
  return numeric.toFixed(2);
}

function formatRevenueValue(value?: string) {
  const numeric = parseNullableNumber(value);
  if (numeric === null) return null;
  if (numeric >= 1_000_000_000_000) return `$${(numeric / 1_000_000_000_000).toFixed(2)}T`;
  if (numeric >= 1_000_000_000) return `$${(numeric / 1_000_000_000).toFixed(1)}B`;
  if (numeric >= 1_000_000) return `$${(numeric / 1_000_000).toFixed(1)}M`;
  return `$${numeric.toFixed(0)}`;
}

function earningsTone(event: CalendarEvent) {
  if (event.beatMissLabel === "Beat" || event.beatMissLabel === "Miss" || event.beatMissLabel === "In line" || event.beatMissLabel === "Upcoming") {
    return event.beatMissLabel;
  }
  const surprise = parseNullableNumber(event.epsSurprisePct);
  if (surprise === null) return "Upcoming";
  if (surprise > 0.5) return "Beat";
  if (surprise < -0.5) return "Miss";
  return "In line";
}

function earningsToneClass(event: CalendarEvent) {
  const tone = earningsTone(event);
  if (tone === "Beat") return "beat";
  if (tone === "Miss") return "miss";
  if (tone === "In line") return "inline";
  return "upcoming";
}

function formatSurprisePct(value?: string) {
  const numeric = parseNullableNumber(value);
  if (numeric === null) return null;
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

function formatMovePct(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function transcriptStatusMeta(status?: string, available?: boolean) {
  if (available) {
    return { label: "Transcript Available", tone: "available" as const };
  }
  if (status === "blocked") {
    return { label: "Transcript Blocked", tone: "restricted" as const };
  }
  if (status === "restricted") {
    return { label: "Transcript Restricted", tone: "restricted" as const };
  }
  if (status === "not_found") {
    return { label: "Transcript Missing", tone: "missing" as const };
  }
  if (status === "error") {
    return { label: "Transcript Error", tone: "missing" as const };
  }
  return null;
}

function filingStatusMeta(confirmed?: boolean, filingDate?: string) {
  if (!confirmed) return null;
  return {
    label: filingDate ? `Filing Verified · ${formatDate(filingDate)}` : "Filing Verified",
    tone: "verified" as const
  };
}

function reactionMoveRank(event: CalendarEvent) {
  const move1d = event.post1dMovePct;
  if (move1d !== undefined && move1d !== null && Number.isFinite(move1d)) return Math.abs(move1d);
  const move2d = event.post2dMovePct;
  if (move2d !== undefined && move2d !== null && Number.isFinite(move2d)) return Math.abs(move2d);
  return Number.NEGATIVE_INFINITY;
}

function hasMeaningfulReaction(event: CalendarEvent) {
  return reactionMoveRank(event) > Number.NEGATIVE_INFINITY;
}

function surpriseRank(event: CalendarEvent) {
  const surprise = parseNullableNumber(event.epsSurprisePct);
  return surprise ?? Number.NEGATIVE_INFINITY;
}

function toneRank(event: CalendarEvent) {
  const tone = earningsTone(event);
  if (tone === "Beat") return 0;
  if (tone === "In line") return 1;
  if (tone === "Miss") return 2;
  return 3;
}

function confidenceRank(label: string) {
  if (label === "Awaiting reaction") return 4;
  if (label === "High confidence") return 0;
  if (label === "Moderate confidence") return 1;
  if (label === "Fragmented") return 2;
  return 3;
}

function urgencyRank(label: string) {
  if (label === "Likely active today") return 0;
  if (label === "Open reaction watch") return 1;
  if (label === "Watch next session") return 2;
  if (label === "After-close setup") return 3;
  if (label === "Monitor local response") return 4;
  if (label === "Single-name watch") return 5;
  if (label === "Awaiting local move") return 6;
  return 6;
}

function timelineSummary(events: CalendarEvent[]) {
  const upcoming = events.filter((event) => daysUntil(event.date) >= 0);
  const today = upcoming.filter((event) => daysUntil(event.date) === 0).slice(0, 2);
  const tomorrow = upcoming.filter((event) => daysUntil(event.date) === 1).slice(0, 2);
  return { today, tomorrow };
}

function groupEventsByDate(events: CalendarEvent[]) {
  const groups = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    groups.set(event.date, [...(groups.get(event.date) ?? []), event]);
  });

  return Array.from(groups.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, groupedEvents]): GroupedCalendarDate => ({
      date,
      label: formatDate(date),
      relativeLabel: relativeDayLabel(date),
      events: groupedEvents.sort((left, right) => {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[left.priority] - priorityOrder[right.priority];
      })
    }));
}

function dedupeByUnderlying(events: CalendarEvent[], sortDirection: "asc" | "desc") {
  const seen = new Set<string>();
  const ordered = [...events].sort((left, right) => sortDirection === "asc"
    ? left.date.localeCompare(right.date)
    : right.date.localeCompare(left.date));

  return ordered.filter((event) => {
    const key = event.underlying ?? event.drSymbol ?? event.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function earningsFacts(event: CalendarEvent) {
  const facts = [
    formatEarningsSession(event.earningsTime),
    event.fiscalPeriod ?? null,
    formatEpsValue(event.epsEstimate) ? `EPS est. ${formatEpsValue(event.epsEstimate)}` : null,
    formatEpsValue(event.epsActual) ? `EPS actual ${formatEpsValue(event.epsActual)}` : null,
    formatRevenueValue(event.revenueEstimate) ? `Revenue est. ${formatRevenueValue(event.revenueEstimate)}` : null,
    formatMovePct(event.post1dMovePct) ? `1D move ${formatMovePct(event.post1dMovePct)}` : null
  ].filter(Boolean) as string[];

  return facts.slice(0, 4);
}

function themeSensitivityLabel(theme: string) {
  const normalized = theme.toLowerCase();
  if (normalized.includes("ai")) return "AI-linked";
  if (normalized.includes("semiconductor")) return "Semiconductor-linked";
  if (normalized.includes("china tech")) return "China Tech-linked";
  if (normalized.includes("technology")) return "Tech-linked";
  if (normalized.includes("gaming")) return "Gaming-linked";
  if (normalized.includes("travel")) return "Travel-linked";
  if (normalized.includes("healthcare")) return "Healthcare defensive";
  if (normalized.includes("finance")) return "Financials-linked";
  if (normalized.includes("energy")) return "Energy-linked";
  if (normalized.includes("consumer")) return "Consumer-linked";
  if (normalized.includes("bond")) return "Income ETF";
  if (normalized.includes("etf")) return "ETF basket";
  return "Global DR-linked";
}

const premiumCards = [
  {
    title: "AI Summary",
    body: "Structured takeaways from revenue, EPS, and guidance in plain language.",
    label: "Premium"
  },
  {
    title: "Transcript Summary",
    body: "Condensed management commentary, guidance shifts, and risk flags after the call.",
    label: "Premium"
  }
];

function getThaiDrAngle(event: CalendarEvent) {
  if (event.thaiDrAngle && event.reactionConfidence && event.reactionUrgency) {
    const inferredSignals: ThaiDrAngleSignal[] = [
      event.drListingCount !== undefined
        ? {
            label: event.drListingCount >= 4 ? "High local coverage" : event.drListingCount >= 2 ? "Multi-listing coverage" : "Single-listing exposure",
            tone: event.drListingCount >= 4 ? "strong" : event.drListingCount >= 2 ? "balanced" : "watch"
          }
        : null,
      event.issuerCount !== undefined
        ? {
            label: event.issuerCount >= 3 ? "Competitive issuer field" : event.issuerCount === 2 ? "Split issuer coverage" : "Single-issuer concentration",
            tone: event.issuerCount >= 3 ? "strong" : event.issuerCount === 2 ? "balanced" : "watch"
          }
        : null,
      event.post1dMovePct !== undefined
        ? {
            label: Math.abs(event.post1dMovePct) >= 8 ? "Sharp post-earnings move" : Math.abs(event.post1dMovePct) >= 3 ? "Clear market reaction" : "Measured price reaction",
            tone: Math.abs(event.post1dMovePct) >= 8 ? "strong" : Math.abs(event.post1dMovePct) >= 3 ? "balanced" : "watch"
          }
        : null
    ].filter(Boolean) as ThaiDrAngleSignal[];

    return {
      headline: [
        event.drListingCount !== undefined ? `${event.drListingCount} Thai DR${event.drListingCount === 1 ? "" : "s"}` : null,
        event.issuerCount !== undefined ? `${event.issuerCount} issuer${event.issuerCount === 1 ? "" : "s"}` : null
      ].filter(Boolean).join(" across "),
      body: [event.mostLiquidDr ? `Most liquid: ${event.mostLiquidDr}` : null, formatMovePct(event.post1dMovePct) ? `Post 1D move ${formatMovePct(event.post1dMovePct)}` : null]
        .filter(Boolean)
        .join(" · "),
      thesis: event.thaiDrAngle,
      reactionPath: event.reactionPath ?? "Thai DR reaction path pending",
      reactionConfidence: {
        label: event.reactionConfidence,
        tone: event.reactionConfidence === "High confidence" ? "strong" : event.reactionConfidence === "Moderate confidence" ? "balanced" : "watch"
      },
      reactionUrgency: {
        label: event.reactionUrgency,
        tone: event.reactionUrgency === "Likely active today" || event.reactionUrgency === "Open reaction watch" ? "strong" : event.reactionUrgency === "Watch next session" || event.reactionUrgency === "After-close setup" || event.reactionUrgency === "Monitor local response" ? "balanced" : "watch"
      },
      signals: inferredSignals
    } satisfies ThaiDrAngle;
  }
  if (!event.underlying) return null;
  const listings = getThaiDrsByUnderlying(event.underlying);
  if (!listings.length) return null;

  const resultTone = earningsTone(event);
  const issuerCount = new Set(listings.map((item) => item.issuerCode ?? item.issuerName ?? item.symbol)).size;
  const mostLiquid = [...listings].sort((left, right) => (right.tradingValueThbM ?? -1) - (left.tradingValueThbM ?? -1))[0] ?? null;
  const countLabel = listings.length === 1 ? "1 Thai DR" : `${listings.length} Thai DRs`;
  const issuerLabel = issuerCount === 1 ? "1 issuer" : `${issuerCount} issuers`;
  const liquidityLead = mostLiquid?.symbol ? `Most liquid: ${mostLiquid.symbol}` : null;
  const themeLabel = event.theme && event.theme !== "Source Market" ? `${event.theme} exposure` : null;
  const themeSensitivity = themeSensitivityLabel(event.theme);
  const coverageTone = listings.length >= 4 ? "High local coverage" : listings.length >= 2 ? "Multi-listing coverage" : "Single-listing exposure";
  const issuerTone = issuerCount >= 3 ? "Competitive issuer field" : issuerCount === 2 ? "Split issuer coverage" : "Single-issuer concentration";
  const liquidityTone = (mostLiquid?.tradingValueThbM ?? 0) >= 25
    ? "High liquidity lead"
    : (mostLiquid?.tradingValueThbM ?? 0) >= 5
      ? "Tradable local lead"
      : "Thin local liquidity";
  const moveMagnitude = reactionMoveRank(event);
  const moveTone = Math.abs(event.post1dMovePct ?? 0) >= 8
    ? "Sharp post-earnings move"
    : Math.abs(event.post1dMovePct ?? 0) >= 3
      ? "Clear market reaction"
      : event.post1dMovePct !== undefined
        ? "Measured price reaction"
        : "Reaction pending";
  const signalPills: ThaiDrAngleSignal[] = [
    { label: coverageTone, tone: listings.length >= 4 ? "strong" : listings.length >= 2 ? "balanced" : "watch" },
    { label: issuerTone, tone: issuerCount >= 3 ? "strong" : issuerCount === 2 ? "balanced" : "watch" },
    { label: liquidityTone, tone: (mostLiquid?.tradingValueThbM ?? 0) >= 25 ? "strong" : (mostLiquid?.tradingValueThbM ?? 0) >= 5 ? "balanced" : "watch" },
    {
      label: moveTone,
      tone: Math.abs(event.post1dMovePct ?? 0) >= 8 ? "strong" : Math.abs(event.post1dMovePct ?? 0) >= 3 ? "balanced" : "watch"
    }
  ];
  const thesis = resultTone === "Beat"
    ? listings.length >= 4
      ? `${themeSensitivity} beat with broad Thai DR coverage`
      : (mostLiquid?.tradingValueThbM ?? 0) >= 5
        ? `${themeSensitivity} beat with an active local trading lead`
        : `${themeSensitivity} beat, but local DR reaction may be selective`
    : resultTone === "Miss"
      ? issuerCount === 1
        ? `${themeSensitivity} miss with single-issuer reaction risk`
        : (mostLiquid?.tradingValueThbM ?? 0) < 5
      ? `${themeSensitivity} miss with thin local liquidity`
          : `${themeSensitivity} miss across a multi-listing DR set`
      : resultTone === "In line"
        ? listings.length >= 3
          ? `${themeSensitivity} in-line result with broad local access`
          : `${themeSensitivity} in-line result with measured DR impact`
        : `Upcoming ${themeSensitivity.toLowerCase()} result with Thai DR coverage`;
  const reactionPath = issuerCount >= 3
    ? `Issuer split may fragment local response, with ${mostLiquid?.symbol ?? "the most liquid DR"} likely trading first`
    : issuerCount === 1
      ? `${mostLiquid?.symbol ?? "The only listed DR"} is likely to absorb the first local reaction`
      : (mostLiquid?.tradingValueThbM ?? 0) >= 10
        ? `Most liquid DR likely reacts first: ${mostLiquid?.symbol ?? event.underlying}`
        : `Local response may build gradually across ${countLabel.toLowerCase()}`;
  const reactionConfidence = issuerCount >= 3 && moveMagnitude < 5
    ? { label: "Fragmented", tone: "watch" as const }
    : moveMagnitude >= 8 && (mostLiquid?.tradingValueThbM ?? 0) >= 10
      ? { label: "High confidence", tone: "strong" as const }
      : moveMagnitude >= 3 && (mostLiquid?.tradingValueThbM ?? 0) >= 5
        ? { label: "Moderate confidence", tone: "balanced" as const }
        : !hasMeaningfulReaction(event)
          ? { label: "Awaiting reaction", tone: "watch" as const }
          : (mostLiquid?.tradingValueThbM ?? 0) >= 25
            ? { label: "High confidence", tone: "strong" as const }
            : (mostLiquid?.tradingValueThbM ?? 0) >= 5
              ? { label: "Moderate confidence", tone: "balanced" as const }
              : { label: "Watch liquidity", tone: "watch" as const };
  const session = formatEarningsSession(event.earningsTime);
  const eventDelta = daysUntil(event.date);
  const reactionUrgency = moveMagnitude >= 8
    ? { label: "Likely active today", tone: "strong" as const }
    : moveMagnitude >= 3
      ? { label: "Open reaction watch", tone: "strong" as const }
      : eventDelta === 0
        ? { label: "Likely active today", tone: "strong" as const }
        : eventDelta === 1
          ? { label: "Watch next session", tone: "balanced" as const }
          : resultTone === "Miss" && issuerCount === 1
            ? { label: "Single-name watch", tone: "watch" as const }
            : session === "After market"
              ? { label: "After-close setup", tone: "balanced" as const }
              : session === "Before market"
                ? { label: "Open reaction watch", tone: "strong" as const }
                : !hasMeaningfulReaction(event)
                  ? { label: "Awaiting local move", tone: "watch" as const }
                  : (mostLiquid?.tradingValueThbM ?? 0) < 5
                    ? { label: "Low local follow-through", tone: "watch" as const }
                    : { label: "Monitor local response", tone: "balanced" as const };
  const moveSummary = formatMovePct(event.post1dMovePct)
    ? `Post 1D move ${formatMovePct(event.post1dMovePct)}`
    : formatMovePct(event.post2dMovePct)
      ? `Post 2D move ${formatMovePct(event.post2dMovePct)}`
      : null;

  return {
    headline: `${countLabel} across ${issuerLabel}`,
    body: [liquidityLead, themeLabel, moveSummary].filter(Boolean).join(" · "),
    thesis,
    reactionPath,
    reactionConfidence,
    reactionUrgency,
    signals: signalPills
  } satisfies ThaiDrAngle;
}

export function CalendarWorkspace({ events: sourceEvents }: { events: SourceCalendarEvent[] }) {
  const [activeWindow, setActiveWindow] = useState<CalendarWindow>("upcoming");
  const [eventType, setEventType] = useState<(typeof eventTypes)[number]>("All");
  const [country, setCountry] = useState<(typeof countries)[number]>("All");
  const [earningsSortMode, setEarningsSortMode] = useState<EarningsSortMode>("actionable");
  const [earningsResultFilter, setEarningsResultFilter] = useState<EarningsResultFilter>("all");
  const [earningsFocusMode, setEarningsFocusMode] = useState<EarningsFocusMode>("upcoming");
  const [query, setQuery] = useState("");
  const events = useMemo(() => createCalendarEvents(sourceEvents), [sourceEvents]);
  const isEarningsMode = activeWindow === "earnings";

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events
      .filter((event) => {
        if (activeWindow === "month") return event.date.startsWith("2026-06") && daysUntil(event.date) >= 0;
        if (activeWindow === "earnings") {
          if (event.type !== "Earnings") return false;
          if (earningsFocusMode === "reported") return daysUntil(event.date) < 0;
          return daysUntil(event.date) >= 0;
        }
        return daysUntil(event.date) >= 0;
      })
      .filter((event) => activeWindow === "earnings" || eventType === "All" || event.type === eventType)
      .filter((event) => country === "All" || event.country === country)
      .filter((event) => {
        if (!normalized) return true;
        return [event.drSymbol, event.underlying, event.company, event.title, event.country, event.type, event.theme]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalized));
      })
      .sort((left, right) => left.date.localeCompare(right.date));
  }, [activeWindow, country, earningsFocusMode, eventType, events, query]);

  const groupedTimeline = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);
  const heroTimeline = timelineSummary(filteredEvents);
  const nextEvent = filteredEvents[0] ?? events.find((event) => daysUntil(event.date) >= 0) ?? events[0];
  const allEarnings = useMemo(() => events.filter((event) => event.type === "Earnings"), [events]);
  const upcomingEarnings = useMemo(
    () => dedupeByUnderlying(allEarnings.filter((event) => daysUntil(event.date) >= 0), "asc").slice(0, 4),
    [allEarnings]
  );
  const upcomingEarningsUniverse = useMemo(
    () => dedupeByUnderlying(allEarnings.filter((event) => daysUntil(event.date) >= 0), "asc"),
    [allEarnings]
  );
  const recentResults = useMemo(
    () => dedupeByUnderlying(
      allEarnings.filter((event) => daysUntil(event.date) < 0 && (event.epsActual || event.epsSurprisePct)),
      "desc"
    ),
    [allEarnings]
  );
  const filteredRecentResults = useMemo(() => {
    if (earningsResultFilter === "winners") return recentResults.filter((event) => earningsTone(event) === "Beat");
    if (earningsResultFilter === "inLine") return recentResults.filter((event) => earningsTone(event) === "In line");
    if (earningsResultFilter === "losers") return recentResults.filter((event) => earningsTone(event) === "Miss");
    return recentResults;
  }, [earningsResultFilter, recentResults]);
  const nextEarnings = upcomingEarnings[0] ?? null;
  const upcomingPayments = filteredEvents.filter((event) => event.type === "Dividend Payment").length;
  const upcomingEarningsWeek = upcomingEarnings.filter((event) => daysUntil(event.date) <= 7).length;
  const recentBeatCount = recentResults.filter((event) => earningsTone(event) === "Beat").length;
  const recentMissCount = recentResults.filter((event) => earningsTone(event) === "Miss").length;
  const recentInlineCount = recentResults.filter((event) => earningsTone(event) === "In line").length;
  const recentResultCounts = {
    all: recentResults.length,
    winners: recentBeatCount,
    inLine: recentInlineCount,
    losers: recentMissCount
  } satisfies Record<EarningsResultFilter, number>;
  const earningsFocusCounts = {
    upcoming: upcomingEarningsUniverse.length,
    reported: recentResults.length
  } satisfies Record<EarningsFocusMode, number>;
  const coveredEarnings = new Set(allEarnings.map((event) => event.underlying ?? event.drSymbol ?? event.id)).size;
  const recentResultTotal = filteredRecentResults.length;
  const recentSummarySegments = [
    { label: "Beat", value: filteredRecentResults.filter((event) => earningsTone(event) === "Beat").length, className: "beat" },
    { label: "In line", value: filteredRecentResults.filter((event) => earningsTone(event) === "In line").length, className: "inline" },
    { label: "Miss", value: filteredRecentResults.filter((event) => earningsTone(event) === "Miss").length, className: "miss" }
  ].filter((segment) => segment.value > 0);
  const thaiDrAngles = filteredRecentResults
    .map((event) => ({
      event,
      angle: getThaiDrAngle(event)
    }))
    .filter((item): item is { event: CalendarEvent; angle: ThaiDrAngle } => item.angle !== null)
    .sort((left, right) => {
      if (earningsSortMode === "newest") return right.event.date.localeCompare(left.event.date);
      if (earningsSortMode === "biggestBeat") {
        const surpriseDelta = surpriseRank(right.event) - surpriseRank(left.event);
        if (surpriseDelta !== 0) return surpriseDelta;
        return right.event.date.localeCompare(left.event.date);
      }
      if (earningsSortMode === "biggestMove") {
        const moveDelta = reactionMoveRank(right.event) - reactionMoveRank(left.event);
        if (moveDelta !== 0) return moveDelta;
        return right.event.date.localeCompare(left.event.date);
      }
      const scoreDelta = (right.event.actionabilityScore ?? Number.NEGATIVE_INFINITY) - (left.event.actionabilityScore ?? Number.NEGATIVE_INFINITY);
      if (scoreDelta !== 0) return scoreDelta;
      const urgencyDelta = urgencyRank(left.angle.reactionUrgency.label) - urgencyRank(right.angle.reactionUrgency.label);
      if (urgencyDelta !== 0) return urgencyDelta;
      const confidenceDelta = confidenceRank(left.angle.reactionConfidence.label) - confidenceRank(right.angle.reactionConfidence.label);
      if (confidenceDelta !== 0) return confidenceDelta;
      const toneDelta = toneRank(left.event) - toneRank(right.event);
      if (toneDelta !== 0) return toneDelta;
      return right.event.date.localeCompare(left.event.date);
    })
    .slice(0, 3);
  const prioritizedRecentResults = [...filteredRecentResults].sort((left, right) => {
    if (earningsSortMode === "newest") return right.date.localeCompare(left.date);
    if (earningsSortMode === "biggestBeat") {
      const surpriseDelta = surpriseRank(right) - surpriseRank(left);
      if (surpriseDelta !== 0) return surpriseDelta;
      return right.date.localeCompare(left.date);
    }
    if (earningsSortMode === "biggestMove") {
      const moveDelta = reactionMoveRank(right) - reactionMoveRank(left);
      if (moveDelta !== 0) return moveDelta;
      return right.date.localeCompare(left.date);
    }
    const scoreDelta = (right.actionabilityScore ?? Number.NEGATIVE_INFINITY) - (left.actionabilityScore ?? Number.NEGATIVE_INFINITY);
    if (scoreDelta !== 0) return scoreDelta;
    const leftAngle = getThaiDrAngle(left);
    const rightAngle = getThaiDrAngle(right);
    const urgencyDelta = urgencyRank(leftAngle?.reactionUrgency.label ?? "") - urgencyRank(rightAngle?.reactionUrgency.label ?? "");
    if (urgencyDelta !== 0) return urgencyDelta;
    const confidenceDelta = confidenceRank(leftAngle?.reactionConfidence.label ?? "") - confidenceRank(rightAngle?.reactionConfidence.label ?? "");
    if (confidenceDelta !== 0) return confidenceDelta;
    const toneDelta = toneRank(left) - toneRank(right);
    if (toneDelta !== 0) return toneDelta;
    return right.date.localeCompare(left.date);
  });
  const transcriptHighlights = prioritizedRecentResults
    .filter((event) => event.transcriptAvailable && event.transcriptTakeawaysTh?.length)
    .slice(0, 3);
  const transcriptAvailableCount = filteredRecentResults.filter((event) => event.transcriptAvailable).length;

  const heroTitle = isEarningsMode ? "Underlying earnings calendar" : "Upcoming DR timeline";
  const heroCopy = isEarningsMode
    ? earningsFocusMode === "reported"
      ? "Review recent reported earnings and translate them into Thai DR market reads."
      : "Track global company earnings dates first, then layer in deeper interpretation for Thai DR investors."
    : "Scan what is about to happen across Thai DR dividends and underlying catalysts.";
  const searchPlaceholder = isEarningsMode ? "Search NVDA, Japan, AI..." : "Search DR, underlying, event...";
  const earningsTimelineHeading = isEarningsMode ? (earningsFocusMode === "reported" ? "Reported Earnings" : "Earnings Calendar") : "Timeline";

  return (
    <div className="drCalendarWorkspace">
      <section className="drCalendarHero compact drCalendarHeroTimeline">
        <div>
          <span className="drRankingBadge">EOD Data · Updated after latest market close</span>
          <h2>{heroTitle}</h2>
          <p>{heroCopy}</p>
        </div>
        <div className="drCalendarHeroRail" aria-label={isEarningsMode ? "Earnings preview" : "Mini upcoming timeline"}>
          {isEarningsMode ? (
            <>
              <article>
                <span>{earningsFocusMode === "reported" ? "Latest reported" : "Next to report"}</span>
                {(earningsFocusMode === "reported" ? prioritizedRecentResults.slice(0, 2) : upcomingEarnings.slice(0, 2)).length ? (earningsFocusMode === "reported" ? prioritizedRecentResults.slice(0, 2) : upcomingEarnings.slice(0, 2)).map((event) => (
                  <strong key={`next-${event.id}`}>{event.underlying} · {earningsFocusMode === "reported" ? earningsTone(event) : formatDate(event.date)}</strong>
                )) : <strong>No upcoming earnings</strong>}
              </article>
              <article>
                <span>{earningsFocusMode === "reported" ? "Thai DR read" : "Recent results"}</span>
                {recentResults.slice(0, 2).length ? recentResults.slice(0, 2).map((event) => (
                  <strong key={`recent-${event.id}`}>{event.underlying} · {earningsFocusMode === "reported" ? (getThaiDrAngle(event)?.reactionConfidence.label ?? earningsTone(event)) : earningsTone(event)}</strong>
                )) : <strong>No results summary yet</strong>}
              </article>
            </>
          ) : (
            <>
              <article>
                <span>Today</span>
                {heroTimeline.today.length ? heroTimeline.today.map((event) => (
                  <strong key={`today-${event.id}`}>{event.title}</strong>
                )) : <strong>No announced events</strong>}
              </article>
              <article>
                <span>Tomorrow</span>
                {heroTimeline.tomorrow.length ? heroTimeline.tomorrow.map((event) => (
                  <strong key={`tomorrow-${event.id}`}>{event.title}</strong>
                )) : <strong>No announced events</strong>}
              </article>
            </>
          )}
        </div>
      </section>

      <section className="drCalendarStats">
        {isEarningsMode ? (
          <>
            <span>Next Earnings <strong>{nextEarnings?.underlying ?? "—"}</strong><small>{nextEarnings ? `${formatDate(nextEarnings.date)} · ${formatEarningsSession(nextEarnings.earningsTime) ?? "Session TBD"}` : "No earnings queued"}</small></span>
            <span>Upcoming This Week <strong>{upcomingEarningsWeek}</strong><small>Forward-looking earnings dates</small></span>
            <span>Recent Beats <strong>{recentBeatCount}</strong><small>Latest reported surprises</small></span>
            <span>Covered Underlyings <strong>{coveredEarnings}</strong><small>Earnings-ready global stocks</small></span>
          </>
        ) : (
          <>
            <span>Next Event <strong>{nextEvent?.title ?? "—"}</strong><small>{nextEvent ? formatDate(nextEvent.date) : "No upcoming event"}</small></span>
            <span>Upcoming This Week <strong>{filteredEvents.filter((event) => daysUntil(event.date) <= 7).length}</strong><small>Forward-looking events</small></span>
            <span>Next Earnings <strong>{nextEarnings?.underlying ?? "—"}</strong><small>{nextEarnings ? formatDate(nextEarnings.date) : "No earnings queued"}</small></span>
            <span>Upcoming Payments <strong>{upcomingPayments}</strong><small>Cashflow events</small></span>
          </>
        )}
      </section>

      <section className="drCalendarControls">
        <div className="drCalendarTabs">
          {windows.map((windowItem) => (
            <button className={activeWindow === windowItem.key ? "active" : ""} key={windowItem.key} onClick={() => setActiveWindow(windowItem.key)} type="button">
              {windowItem.label}
            </button>
          ))}
        </div>
        {isEarningsMode ? (
          <div className="drEarningsFocusModes" role="tablist" aria-label="Earnings focus mode">
            {earningsFocusModes.map((mode) => (
              <button
                aria-selected={earningsFocusMode === mode.key}
                className={earningsFocusMode === mode.key ? "active" : ""}
                key={mode.key}
                onClick={() => setEarningsFocusMode(mode.key)}
                type="button"
              >
                {mode.label} ({earningsFocusCounts[mode.key]})
              </button>
            ))}
          </div>
        ) : null}
        <div className={`drCalendarFilters compact${isEarningsMode ? " earnings" : ""}`}>
          <label>
            <span>Search</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} />
          </label>
          {!isEarningsMode ? (
            <label>
              <span>Event Type</span>
              <select value={eventType} onChange={(event) => setEventType(event.target.value as (typeof eventTypes)[number])}>
                {eventTypes.map((item) => <option key={item} value={item}>{filterTypeLabel(item)}</option>)}
              </select>
            </label>
          ) : null}
          <label>
            <span>Country</span>
            <select value={country} onChange={(event) => setCountry(event.target.value as (typeof countries)[number])}>
              {countries.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
        {isEarningsMode ? (
          <div className="drEarningsSortBar">
            <span>Rank</span>
            <div className="drEarningsSortModes" role="tablist" aria-label="Earnings sort mode">
              {earningsSortModes.map((mode) => (
                <button
                  aria-selected={earningsSortMode === mode.key}
                  className={earningsSortMode === mode.key ? "active" : ""}
                  key={mode.key}
                  onClick={() => setEarningsSortMode(mode.key)}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {isEarningsMode ? (
        <section className="drEarningsCenter">
          <article className="drEarningsPanel premium">
            <div className="drEarningsPanelHead">
              <div>
                <span className="drEarningsTier premium">Premium</span>
                <h3>Transcript Takeaways</h3>
              </div>
              <div className="drEarningsPanelHeadMeta">
                <small>{transcriptAvailableCount} reported names now have mapped call transcripts</small>
                <button
                  className="drEarningsInlineAction"
                  onClick={() => setEarningsFocusMode("reported")}
                  type="button"
                >
                  View Reported
                </button>
              </div>
            </div>
            <div className="drEarningsTranscriptGrid">
              {transcriptHighlights.length ? transcriptHighlights.map((event) => (
                <div className="drEarningsTranscriptCard" key={`transcript-${event.id}`}>
                  <div className="drEarningsResultTop">
                    <div className="drEventWithLogo"><UnderlyingLogoMark symbol={event.underlying ?? event.drSymbol ?? event.company} className="compact" /><strong>{event.underlying}</strong></div>
                    <div className="drEarningsAngleBadges">
                      <span className={`drEarningsTranscriptBadge ${transcriptStatusMeta(event.transcriptStatus, event.transcriptAvailable)?.tone ?? "available"}`}>
                        {event.transcriptSummary ? "Transcript Mapped" : "Transcript Available"}
                      </span>
                      <span className={`drEarningsOutcome ${earningsToneClass(event)}`}>{earningsTone(event)}</span>
                    </div>
                  </div>
                  <h4>{event.company}</h4>
                  <p>{event.fiscalPeriod ?? "Latest reported quarter"} · {formatDate(event.date)}</p>
                  {event.transcriptSummary ? <small>{event.transcriptSummary}</small> : null}
                  <div className="drEarningsTranscriptInsight prominent">
                    {event.managementFocusTh ? <p><strong>Management</strong> {event.managementFocusTh}</p> : null}
                    {event.analystFocusTh ? <p><strong>Q&A</strong> {event.analystFocusTh}</p> : null}
                    <ul>
                      {event.transcriptTakeawaysTh?.map((item) => (
                        <li key={`${event.id}-highlight-${item}`}>{item}</li>
                      ))}
                    </ul>
                    {event.transcriptTopics?.length ? (
                      <div className="drEarningsTranscriptTopics">
                        {event.transcriptTopics.slice(0, 4).map((topic) => (
                          <span key={`${event.id}-topic-${topic}`}>{topic}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {event.filingConfirmed && event.filingUrl ? (
                    <a className="drEarningsSourceLink" href={event.filingUrl} rel="noreferrer" target="_blank">
                      Official filing
                    </a>
                  ) : null}
                </div>
              )) : (
                <div className="drEarningsTranscriptCard empty">
                  <strong>No transcript highlights yet</strong>
                  <p>As more reported names map to local transcripts, this block will surface the strongest call takeaways first.</p>
                </div>
              )}
            </div>
          </article>

          {earningsFocusMode === "upcoming" ? <article className="drEarningsPanel">
            <div className="drEarningsPanelHead">
              <div>
                <span className="drEarningsTier free">Free</span>
                <h3>Upcoming earnings calendar</h3>
              </div>
              <small>Dates, session, estimates</small>
            </div>
            <div className="drEarningsPreviewGrid">
              {upcomingEarnings.slice(0, 3).length ? upcomingEarnings.slice(0, 3).map((event) => (
                <div className="drEarningsPreviewCard" key={`upcoming-${event.id}`}>
                  <div className="drEventWithLogo"><UnderlyingLogoMark symbol={event.underlying ?? event.drSymbol ?? event.company} className="compact" /><strong>{event.underlying}</strong></div>
                  <p>{event.company}</p>
                  <span>{formatDate(event.date)} · {formatEarningsSession(event.earningsTime) ?? "Session TBD"}</span>
                  <small>{[event.country, event.theme, event.fiscalPeriod].filter(Boolean).join(" · ")}</small>
                  <div className="drEarningsFactRow">
                    {formatEpsValue(event.epsEstimate) ? <span>EPS est. {formatEpsValue(event.epsEstimate)}</span> : null}
                    {formatRevenueValue(event.revenueEstimate) ? <span>{formatRevenueValue(event.revenueEstimate)}</span> : null}
                  </div>
                </div>
              )) : <div className="drEarningsPreviewCard"><strong>No upcoming earnings</strong><p>This coverage block will fill as the next reporting dates are available.</p></div>}
            </div>
          </article> : null}

          {earningsFocusMode === "reported" ? <article className="drEarningsPanel">
            <div className="drEarningsPanelHead">
              <div>
                <span className="drEarningsTier free">Free</span>
                <h3>Recent results</h3>
              </div>
              <small>Beat, miss, surprise</small>
            </div>
            {recentResultTotal ? (
              <div className="drEarningsSummary">
                <div className="drEarningsResultFilters" role="tablist" aria-label="Earnings result filter">
                  {earningsResultFilters.map((filter) => (
                    <button
                      aria-selected={earningsResultFilter === filter.key}
                      className={earningsResultFilter === filter.key ? "active" : ""}
                      key={filter.key}
                      onClick={() => setEarningsResultFilter(filter.key)}
                      type="button"
                    >
                      {filter.label} ({recentResultCounts[filter.key]})
                    </button>
                  ))}
                </div>
                <div className="drEarningsSummaryBar" aria-label="Beat miss summary">
                  {recentSummarySegments.map((segment) => (
                    <span
                      className={segment.className}
                      key={segment.label}
                      style={{ width: `${(segment.value / recentResultTotal) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="drEarningsSummaryLegend">
                  {[
                    { label: "Beat", value: filteredRecentResults.filter((event) => earningsTone(event) === "Beat").length, className: "beat" },
                    { label: "In line", value: filteredRecentResults.filter((event) => earningsTone(event) === "In line").length, className: "inline" },
                    { label: "Miss", value: filteredRecentResults.filter((event) => earningsTone(event) === "Miss").length, className: "miss" }
                  ].map((segment) => (
                    <span className={segment.className} key={segment.label}>
                      <i aria-hidden="true" />
                      {segment.label} {segment.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="drEarningsPreviewGrid">
              {prioritizedRecentResults.slice(0, 3).length ? prioritizedRecentResults.slice(0, 3).map((event) => (
                <div className="drEarningsPreviewCard result" key={`result-${event.id}`}>
                  <div className="drEarningsResultTop">
                    <div className="drEventWithLogo"><UnderlyingLogoMark symbol={event.underlying ?? event.drSymbol ?? event.company} className="compact" /><strong>{event.underlying}</strong></div>
                    <span className={`drEarningsOutcome ${earningsToneClass(event)}`}>{earningsTone(event)}</span>
                  </div>
                  <p>{event.company}</p>
                  <span>{event.fiscalPeriod ?? "Latest reported quarter"} · {formatDate(event.date)}</span>
                  <div className="drEarningsFactRow">
                    {formatEpsValue(event.epsActual) ? <span>EPS {formatEpsValue(event.epsActual)}</span> : null}
                    {formatEpsValue(event.epsEstimate) ? <span>vs est. {formatEpsValue(event.epsEstimate)}</span> : null}
                    {formatSurprisePct(event.epsSurprisePct) ? <span>{formatSurprisePct(event.epsSurprisePct)} surprise</span> : null}
                  </div>
                  {formatMovePct(event.post1dMovePct) || formatMovePct(event.post2dMovePct) ? (
                    <div className="drEarningsReactionRow">
                      {formatMovePct(event.post1dMovePct) ? <span className={event.post1dMovePct! >= 0 ? "positive" : "negative"}>1D {formatMovePct(event.post1dMovePct)}</span> : null}
                      {formatMovePct(event.post2dMovePct) ? <span className={event.post2dMovePct! >= 0 ? "positive" : "negative"}>2D {formatMovePct(event.post2dMovePct)}</span> : null}
                    </div>
                  ) : null}
                  {transcriptStatusMeta(event.transcriptStatus, event.transcriptAvailable) ? (
                    <div className="drEarningsMetaRow">
                      <span className={`drEarningsTranscriptBadge ${transcriptStatusMeta(event.transcriptStatus, event.transcriptAvailable)!.tone}`}>
                        {transcriptStatusMeta(event.transcriptStatus, event.transcriptAvailable)!.label}
                      </span>
                      {filingStatusMeta(event.filingConfirmed, event.filingDate) ? (
                        <span className={`drEarningsTranscriptBadge ${filingStatusMeta(event.filingConfirmed, event.filingDate)!.tone}`}>
                          {filingStatusMeta(event.filingConfirmed, event.filingDate)!.label}
                        </span>
                      ) : null}
                    </div>
                  ) : filingStatusMeta(event.filingConfirmed, event.filingDate) ? (
                    <div className="drEarningsMetaRow">
                      <span className={`drEarningsTranscriptBadge ${filingStatusMeta(event.filingConfirmed, event.filingDate)!.tone}`}>
                        {filingStatusMeta(event.filingConfirmed, event.filingDate)!.label}
                      </span>
                    </div>
                  ) : null}
                  {event.filingConfirmed && event.filingUrl ? (
                    <a className="drEarningsSourceLink" href={event.filingUrl} rel="noreferrer" target="_blank">
                      Official filing
                    </a>
                  ) : null}
                  {event.aiSummary ? <small>{event.aiSummary}</small> : null}
                </div>
              )) : <div className="drEarningsPreviewCard"><strong>No matching results</strong><p>Try switching between All Results, Winners, or Losers.</p></div>}
            </div>
          </article> : null}

          {earningsFocusMode === "reported" ? <article className="drEarningsPanel premium">
            <div className="drEarningsPanelHead">
              <div>
                <span className="drEarningsTier premium">Premium</span>
                <h3>Earnings intelligence</h3>
              </div>
              <small>Interpretation layer</small>
            </div>
            <div className="drEarningsAngleList">
              <div className="drEarningsAngleHead">
                <strong>Thai DR Angle</strong>
                <span>What this means for local DR coverage</span>
              </div>
              {thaiDrAngles.length ? thaiDrAngles.map(({ event, angle }) => (
                <div className="drEarningsAngleCard" key={`angle-${event.id}`}>
                  <div className="drEarningsResultTop">
                    <div className="drEventWithLogo"><UnderlyingLogoMark symbol={event.underlying ?? event.drSymbol ?? event.company} className="compact" /><strong>{event.underlying}</strong></div>
                    <div className="drEarningsAngleBadges">
                      <span className={`drEarningsUrgency ${angle.reactionUrgency.tone}`}>{angle.reactionUrgency.label}</span>
                      <span className={`drEarningsConfidence ${angle.reactionConfidence.tone}`}>{angle.reactionConfidence.label}</span>
                      <span className={`drEarningsOutcome ${earningsToneClass(event)}`}>{earningsTone(event)}</span>
                    </div>
                  </div>
                  <h4>{angle.thesis}</h4>
                  <p>{angle.headline}</p>
                  <em>{angle.reactionPath}</em>
                  {transcriptStatusMeta(event.transcriptStatus, event.transcriptAvailable) ? (
                    <div className="drEarningsMetaRow">
                      <span className={`drEarningsTranscriptBadge ${transcriptStatusMeta(event.transcriptStatus, event.transcriptAvailable)!.tone}`}>
                        {transcriptStatusMeta(event.transcriptStatus, event.transcriptAvailable)!.label}
                      </span>
                      {filingStatusMeta(event.filingConfirmed, event.filingDate) ? (
                        <span className={`drEarningsTranscriptBadge ${filingStatusMeta(event.filingConfirmed, event.filingDate)!.tone}`}>
                          {filingStatusMeta(event.filingConfirmed, event.filingDate)!.label}
                        </span>
                      ) : null}
                    </div>
                  ) : filingStatusMeta(event.filingConfirmed, event.filingDate) ? (
                    <div className="drEarningsMetaRow">
                      <span className={`drEarningsTranscriptBadge ${filingStatusMeta(event.filingConfirmed, event.filingDate)!.tone}`}>
                        {filingStatusMeta(event.filingConfirmed, event.filingDate)!.label}
                      </span>
                    </div>
                  ) : null}
                  <small>{event.aiSummary ?? angle.body}</small>
                  {event.transcriptSummary ? <small>{event.transcriptSummary}</small> : null}
                  {event.transcriptTakeawaysTh?.length ? (
                    <div className="drEarningsTranscriptInsight">
                      {event.managementFocusTh ? <p><strong>Management</strong> {event.managementFocusTh}</p> : null}
                      {event.analystFocusTh ? <p><strong>Q&A</strong> {event.analystFocusTh}</p> : null}
                      <ul>
                        {event.transcriptTakeawaysTh.map((item) => (
                          <li key={`${event.id}-${item}`}>{item}</li>
                        ))}
                      </ul>
                      {event.transcriptTopics?.length ? (
                        <div className="drEarningsTranscriptTopics">
                          {event.transcriptTopics.slice(0, 4).map((topic) => (
                            <span key={`${event.id}-${topic}`}>{topic}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {event.filingConfirmed && event.filingUrl ? (
                    <a className="drEarningsSourceLink" href={event.filingUrl} rel="noreferrer" target="_blank">
                      Official filing
                    </a>
                  ) : null}
                  <div className="drEarningsAngleSignals">
                    {angle.signals.map((signal) => (
                      <span className={signal.tone} key={`${event.id}-${signal.label}`}>{signal.label}</span>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="drEarningsAngleCard">
                  <strong>Thai DR Angle</strong>
                  <p>Coverage notes appear here once recent reported results map to Thai DR listings.</p>
                </div>
              )}
            </div>
            <div className="drEarningsPremiumGrid">
              {premiumCards.map((card) => (
                <div className="drEarningsPremiumCard" key={card.title}>
                  <strong>{card.title}</strong>
                  <p>{card.body}</p>
                  <span>{card.label}</span>
                </div>
              ))}
            </div>
          </article> : null}
        </section>
      ) : null}

      <section className="drCalendarTimelineShell">
        <div className="drCalendarTimelineHead">
          <h2>{earningsTimelineHeading}</h2>
          <div
            className="drCalendarScopeHint"
            title={isEarningsMode
              ? "Free: earnings dates, session, and estimates. Premium: results summary, DR angle, transcript summary."
              : "Includes XD dates, payment dates, earnings, listings, and source-market updates."}
          >
            i
          </div>
        </div>
        <div className="drCalendarTimeline grouped">
          {groupedTimeline.length === 0 ? (
            <div className="drCalendarEmpty">No events matched this view.</div>
          ) : null}
          {groupedTimeline.map((group) => (
            <section className="drCalendarDateGroup" key={group.date}>
              <div className="drCalendarDateRail">
                <strong>{group.label}</strong>
                <span>{group.relativeLabel}</span>
              </div>
              <div className="drCalendarDateStack">
                {group.events.map((event) => {
                  const href = eventLink(event);
                  const detailNode = (
                    <>
                      <div className="drCalendarTimelineDot" aria-hidden="true" />
                      <div className="drCalendarEventCopy">
                        <span className={`drCalendarType ${typeClass(event.type)}`}>{eventTypeLabel(event.type)}</span>
                        <div className="drEventWithLogo timeline">
                          {event.underlying ? <UnderlyingLogoMark symbol={event.underlying} className="compact" /> : null}
                          <h3 className="drNameClamp" title={event.title}>{event.title}</h3>
                        </div>
                        <p>{event.note}</p>
                        {event.type === "Earnings" && earningsFacts(event).length ? (
                          <div className="drCalendarFactRow">
                            {earningsFacts(event).map((fact) => <span key={`${event.id}-${fact}`}>{fact}</span>)}
                          </div>
                        ) : null}
                        {event.type === "Earnings" && (formatMovePct(event.post1dMovePct) || formatMovePct(event.post2dMovePct)) ? (
                          <div className="drEarningsReactionRow timeline">
                            {formatMovePct(event.post1dMovePct) ? <span className={event.post1dMovePct! >= 0 ? "positive" : "negative"}>Post 1D {formatMovePct(event.post1dMovePct)}</span> : null}
                            {formatMovePct(event.post2dMovePct) ? <span className={event.post2dMovePct! >= 0 ? "positive" : "negative"}>Post 2D {formatMovePct(event.post2dMovePct)}</span> : null}
                          </div>
                        ) : null}
                        {event.type === "Earnings" && filingStatusMeta(event.filingConfirmed, event.filingDate) ? (
                          <div className="drEarningsMetaRow timeline">
                            <span className={`drEarningsTranscriptBadge ${filingStatusMeta(event.filingConfirmed, event.filingDate)!.tone}`}>
                              {filingStatusMeta(event.filingConfirmed, event.filingDate)!.label}
                            </span>
                            {event.filingConfirmed && event.filingUrl ? (
                              <a className="drEarningsSourceLink" href={event.filingUrl} rel="noreferrer" target="_blank">
                                Official filing
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                        {showDividendYield(event) ? <span className="drCalendarYieldFact">{event.yieldPct!.toFixed(2)}% yield</span> : null}
                        <small>{event.drSymbol ?? event.underlying ?? event.country} · {event.country} · {event.assetType} / {event.theme}</small>
                      </div>
                      <div className="drCalendarEventMeta">
                        <strong>{relativeDayLabel(event.date)}</strong>
                        <span>{event.underlying ?? event.company}</span>
                      </div>
                    </>
                  );

                  if (href) {
                    return (
                      <Link className={`drCalendarTimelineRow ${typeClass(event.type)}`} key={event.id} href={href}>
                        {detailNode}
                      </Link>
                    );
                  }

                  return (
                    <button className={`drCalendarTimelineRow ${typeClass(event.type)}`} key={event.id} type="button">
                      {detailNode}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
