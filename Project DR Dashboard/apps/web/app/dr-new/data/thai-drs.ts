import profileSource from "../../../../../KB/dr_profile_enrichment.json";
import drPriceMetricsSource from "../../../../../KB/dr_price_metrics.json";
import tradingSummarySource from "../../../../../KB/dr_historical_trading_summary.json";
import tradingViewDrMapSource from "../../../../../tradingview_dr_map.json";
import { normalizeUnderlyingSymbol } from "./underlying-aliases";
import type { ThaiDr, ThaiDrAssetType, ThaiDrStatus } from "./types";

type SourceMap<T> = Record<string, T | undefined>;
type ProfileRecord = {
  ticker?: string;
  dr_name?: string;
  issuer_code?: string;
  issuer_name?: string;
  issuer_website?: string;
  market?: string;
  currency?: string;
  isin?: string;
  conversion_ratio?: string;
  underlying?: string;
  underlying_name?: string;
  memorandum_url?: string;
  official_quote_url?: string;
  trading_session?: string;
  first_trade_date?: string;
  outstanding_share?: number;
  outstanding_date?: string;
  security_type_name?: string;
};
type TradingRecord = {
  latest_date?: string;
  latest_close?: number;
  latest_open?: number;
  latest_volume?: number;
  latest_value?: number;
  average_close?: number;
  average_volume?: number;
};
type DrPriceMetricRecord = {
  firstDate?: string | null;
  latestDate?: string | null;
  latestOpen?: number | null;
  latestClose?: number | null;
  latestPrior?: number | null;
  latestChangePct?: number | null;
  latestVolume?: number | null;
  latestValue?: number | null;
  latestMarketCap?: number | null;
  latestPe?: number | null;
  latestPbv?: number | null;
  latestYieldPct?: number | null;
  oneWeekChangePct?: number | null;
  oneMonthChangePct?: number | null;
  averageValue5d?: number | null;
  averageValue20d?: number | null;
  averageVolume5d?: number | null;
  rowCount?: number | null;
};
type TradingViewDrMapItem = {
  ticker?: string;
  underlying_code?: string;
  underlying_name?: string;
  issuer_code?: string | null;
  issuer_name?: string | null;
  conversionRatio?: string | null;
  ratio_text?: string | null;
};
type TradingViewDrMap = {
  items?: TradingViewDrMapItem[];
};

const profileMap = profileSource as SourceMap<ProfileRecord>;
const tradingMap = tradingSummarySource as SourceMap<TradingRecord>;
const drPriceMetricMap = drPriceMetricsSource as SourceMap<DrPriceMetricRecord>;
const tradingViewItems = (tradingViewDrMapSource as TradingViewDrMap).items ?? [];

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusFromTrading(summary: TradingRecord | undefined, metric: DrPriceMetricRecord | undefined): ThaiDrStatus {
  if (metric?.latestDate && ((metric.latestVolume ?? 0) > 0 || (metric.latestValue ?? 0) > 0)) return "live";
  if (!summary?.latest_date) return "no-feed";
  if ((summary.latest_volume ?? 0) <= 0 && (summary.latest_value ?? 0) <= 0) return "no-feed";
  return "live";
}

function assetTypeFromProfile(profile: ProfileRecord): ThaiDrAssetType {
  const corpus = `${profile.dr_name ?? ""} ${profile.security_type_name ?? ""} ${profile.underlying_name ?? ""}`.toLowerCase();
  if (corpus.includes("bond")) return "Bond DR";
  if (corpus.includes("gold") || corpus.includes("oil") || corpus.includes("commodity")) return "Commodity DR";
  if (corpus.includes("index")) return "Index DR";
  if (corpus.includes("etf")) return "ETF DR";
  return "Stock DR";
}

function drChangeFromOpen(summary: TradingRecord | undefined) {
  const close = toNumber(summary?.latest_close);
  const open = toNumber(summary?.latest_open);
  if (close === null || open === null || open === 0) return null;
  return ((close - open) / open) * 100;
}

function averageTradingValueThbM(summary: TradingRecord | undefined) {
  const averageClose = toNumber(summary?.average_close);
  const averageVolume = toNumber(summary?.average_volume);
  if (averageClose === null || averageVolume === null) return null;
  return (averageClose * averageVolume) / 1_000_000;
}

function latestTradingValueThbM(metric: DrPriceMetricRecord | undefined, summary: TradingRecord | undefined) {
  const metricValue = toNumber(metric?.latestValue);
  if (metricValue !== null) return metricValue / 1_000_000;
  const summaryValue = toNumber(summary?.latest_value);
  return summaryValue === null ? null : summaryValue / 1_000_000;
}

function averageTradingValue5dThbM(metric: DrPriceMetricRecord | undefined, summary: TradingRecord | undefined) {
  const metricAverage = toNumber(metric?.averageValue5d);
  if (metricAverage !== null) return metricAverage / 1_000_000;
  return averageTradingValueThbM(summary);
}

function profileFromTradingViewItem(item: TradingViewDrMapItem): ProfileRecord | null {
  if (!item.ticker || !item.underlying_code) return null;
  return {
    ticker: item.ticker,
    dr_name: item.underlying_name ?? `Depositary Receipt on ${item.underlying_code}`,
    issuer_code: item.issuer_code ?? item.issuer_name ?? undefined,
    issuer_name: item.issuer_name ?? item.issuer_code ?? undefined,
    underlying: item.underlying_code,
    underlying_name: item.underlying_name ?? item.underlying_code,
    conversion_ratio: item.ratio_text ?? item.conversionRatio ?? undefined
  };
}

function mergedProfiles() {
  const profiles = new Map<string, ProfileRecord>();

  Object.entries(profileMap).forEach(([symbol, profile]) => {
    const ticker = profile?.ticker ?? symbol;
    if (!ticker) return;
    profiles.set(ticker.toUpperCase(), { ...profile, ticker });
  });

  tradingViewItems.forEach((item) => {
    const profile = profileFromTradingViewItem(item);
    if (!profile?.ticker) return;
    const key = profile.ticker.toUpperCase();
    if (profiles.has(key)) return;
    profiles.set(key, profile);
  });

  return profiles;
}

export const thaiDrs: ThaiDr[] = Array.from(mergedProfiles().entries())
  .map(([symbol, profile]) => {
    const ticker = profile.ticker ?? symbol;
    const trading = tradingMap[ticker];
    const metric = drPriceMetricMap[ticker];
    const documentUrl = profile?.memorandum_url ?? null;
    return {
      symbol: ticker,
      underlyingSymbol: normalizeUnderlyingSymbol(profile?.underlying),
      name: profile?.dr_name ?? null,
      issuerCode: profile?.issuer_code ?? null,
      issuerName: profile?.issuer_name ?? null,
      issuerWebsite: profile?.issuer_website ?? null,
      market: "SET",
      assetType: assetTypeFromProfile(profile ?? {}),
      tradingCurrency: "THB",
      drPriceThb: toNumber(metric?.latestClose) ?? toNumber(trading?.latest_close),
      drChangePct1d: toNumber(metric?.latestChangePct) ?? drChangeFromOpen(trading),
      drChangePct1w: toNumber(metric?.oneWeekChangePct),
      drChangePct1m: toNumber(metric?.oneMonthChangePct),
      volume: toNumber(metric?.latestVolume) ?? toNumber(trading?.latest_volume),
      tradingValueThbM: latestTradingValueThbM(metric, trading),
      averageTradingValueThbM: averageTradingValue5dThbM(metric, trading),
      conversionRatio: profile?.conversion_ratio ?? null,
      officialSetPageUrl: profile?.official_quote_url ?? null,
      documents: documentUrl ? [{ label: "Documents", url: documentUrl }] : [],
      firstTradeDate: profile?.first_trade_date ?? null,
      isin: profile?.isin ?? null,
      tradingSession: profile?.trading_session ?? null,
      outstandingShare: toNumber(profile?.outstanding_share),
      outstandingDate: profile?.outstanding_date ?? null,
      status: statusFromTrading(trading, metric),
      asOfDate: metric?.latestDate ?? trading?.latest_date ?? null
    } satisfies ThaiDr;
  })
  .filter((dr) => dr.underlyingSymbol)
  .sort((left, right) => left.symbol.localeCompare(right.symbol));

export const thaiDrBySymbol = new Map(thaiDrs.map((dr) => [dr.symbol.toUpperCase(), dr]));
