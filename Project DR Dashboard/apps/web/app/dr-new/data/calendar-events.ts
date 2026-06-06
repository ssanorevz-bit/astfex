import earningsSource from "../../../../../KB/underlying_earnings.json";
import earningsResultsSource from "../../../../../KB/earnings/underlying_earnings_results.json";
import earningsIntelligenceSource from "../../../../../KB/earnings/underlying_earnings_intelligence.json";
import earningsReactionsSource from "../../../../../KB/earnings/underlying_earnings_reactions.json";
import { thaiDrDividendEvents } from "./dividend-events";
import { thaiDrs } from "./thai-drs";
import { normalizeUnderlyingSymbol } from "./underlying-aliases";
import { underlyingBySymbol } from "./underlyings";
import type { CalendarEvent } from "./types";

type EarningsRecord = {
  underlying_symbol?: string;
  earnings_date?: string;
  earnings_time?: string | null;
  fiscal_period?: string | null;
  eps_estimate?: string | number | null;
  revenue_estimate?: string | number | null;
  eps_actual?: string | number | null;
  eps_surprise_pct?: string | number | null;
  filing_confirmed?: boolean | null;
  filing_date?: string | null;
  filing_url?: string | null;
  source_url?: string | null;
};

type EarningsReactionRecord = {
  underlying_symbol?: string;
  earnings_date?: string;
  post_1d_move_pct?: number | null;
  post_2d_move_pct?: number | null;
};

type EarningsIntelligenceRecord = {
  underlying_symbol?: string;
  earnings_date?: string;
  beat_miss_label?: string | null;
  guidance_label?: string | null;
  reaction_path?: string | null;
  reaction_confidence?: string | null;
  reaction_urgency?: string | null;
  thai_dr_angle?: string | null;
  ai_summary?: string | null;
  transcript_summary?: string | null;
  transcript_status?: string | null;
  transcript_available?: boolean | null;
  transcript_takeaways_th?: string[] | null;
  management_focus_th?: string | null;
  analyst_focus_th?: string | null;
  transcript_topics?: string[] | null;
  dr_listing_count?: number | null;
  issuer_count?: number | null;
  most_liquid_dr?: string | null;
  most_liquid_dr_value_thb_m?: number | null;
  actionability_score?: number | null;
};

const earningsMap = earningsSource as Record<string, EarningsRecord[] | undefined>;
const earningsResults = earningsResultsSource as EarningsRecord[];
const earningsReactions = earningsReactionsSource as EarningsReactionRecord[];
const earningsIntelligence = earningsIntelligenceSource as EarningsIntelligenceRecord[];
const earningsReactionMap = new Map<string, EarningsReactionRecord>();
const earningsIntelligenceMap = new Map<string, EarningsIntelligenceRecord>();
earningsReactions.forEach((reaction) => {
  const underlyingSymbol = normalizeUnderlyingSymbol(reaction.underlying_symbol ?? null);
  const earningsDate = reaction.earnings_date ?? null;
  if (!underlyingSymbol || !earningsDate) return;
  earningsReactionMap.set(`${underlyingSymbol}::${earningsDate}`, reaction);
});
earningsIntelligence.forEach((entry) => {
  const underlyingSymbol = normalizeUnderlyingSymbol(entry.underlying_symbol ?? null);
  const earningsDate = entry.earnings_date ?? null;
  if (!underlyingSymbol || !earningsDate) return;
  earningsIntelligenceMap.set(`${underlyingSymbol}::${earningsDate}`, entry);
});
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

function toNullableText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function buildEarningsEvent(event: EarningsRecord, sourceUnderlyingSymbol: string, index: number): CalendarEvent[] {
  const underlyingSymbol = normalizeUnderlyingSymbol(sourceUnderlyingSymbol);
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
  const reaction = earningsReactionMap.get(`${underlyingSymbol}::${earningsDate}`);
  const intelligence = earningsIntelligenceMap.get(`${underlyingSymbol}::${earningsDate}`);
  return [{
    id: `${underlyingSymbol}-earnings-${event.earnings_date}-${index}`,
    date: earningsDate,
    type: "Earnings",
    drSymbol,
    underlyingSymbol,
    title: `${underlyingSymbol} earnings`,
    note: [event.fiscal_period, event.earnings_time ? event.earnings_time.toUpperCase() : null].filter(Boolean).join(" · ") || null,
    earningsTime: event.earnings_time ?? null,
    fiscalPeriod: event.fiscal_period ?? null,
    epsEstimate: toNullableText(event.eps_estimate),
    revenueEstimate: toNullableText(event.revenue_estimate),
    epsActual: toNullableText(event.eps_actual),
    epsSurprisePct: toNullableText(event.eps_surprise_pct),
    post1dMovePct: reaction?.post_1d_move_pct ?? null,
    post2dMovePct: reaction?.post_2d_move_pct ?? null,
    beatMissLabel: intelligence?.beat_miss_label ?? null,
    guidanceLabel: intelligence?.guidance_label ?? null,
    reactionPath: intelligence?.reaction_path ?? null,
    reactionConfidence: intelligence?.reaction_confidence ?? null,
    reactionUrgency: intelligence?.reaction_urgency ?? null,
    thaiDrAngle: intelligence?.thai_dr_angle ?? null,
    aiSummary: intelligence?.ai_summary ?? null,
    transcriptSummary: intelligence?.transcript_summary ?? null,
    transcriptStatus: intelligence?.transcript_status ?? null,
    transcriptAvailable: intelligence?.transcript_available ?? null,
    transcriptTakeawaysTh: intelligence?.transcript_takeaways_th ?? null,
    managementFocusTh: intelligence?.management_focus_th ?? null,
    analystFocusTh: intelligence?.analyst_focus_th ?? null,
    transcriptTopics: intelligence?.transcript_topics ?? null,
    drListingCount: intelligence?.dr_listing_count ?? null,
    issuerCount: intelligence?.issuer_count ?? null,
    mostLiquidDr: intelligence?.most_liquid_dr ?? null,
    mostLiquidDrValueThbM: intelligence?.most_liquid_dr_value_thb_m ?? null,
    actionabilityScore: intelligence?.actionability_score ?? null,
    filingConfirmed: event.filing_confirmed ?? null,
    filingDate: event.filing_date ?? null,
    filingUrl: event.filing_url ?? null,
    source: "Underlying Earnings",
    sourceUrl: event.source_url ?? null
  }];
}

const earningsEventMap = new Map<string, CalendarEvent>();
Object.entries(earningsMap).forEach(([sourceUnderlyingSymbol, events]) => {
  if (!events) return;
  events.forEach((event, index) => {
    buildEarningsEvent(event, sourceUnderlyingSymbol, index).forEach((built) => {
      earningsEventMap.set(`${built.underlyingSymbol}::${built.date}`, built);
    });
  });
});

earningsResults.forEach((event, index) => {
  const sourceUnderlyingSymbol = event.underlying_symbol ?? "";
  buildEarningsEvent(event, sourceUnderlyingSymbol, index).forEach((built) => {
    const key = `${built.underlyingSymbol}::${built.date}`;
    const existing = earningsEventMap.get(key);
    earningsEventMap.set(
      key,
      existing
        ? {
            ...existing,
            ...built,
            epsActual: built.epsActual ?? existing.epsActual,
            epsSurprisePct: built.epsSurprisePct ?? existing.epsSurprisePct,
            filingConfirmed: built.filingConfirmed ?? existing.filingConfirmed,
            filingDate: built.filingDate ?? existing.filingDate,
            filingUrl: built.filingUrl ?? existing.filingUrl,
          }
        : built
    );
  });
});

const earningsEvents: CalendarEvent[] = Array.from(earningsEventMap.values());

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
