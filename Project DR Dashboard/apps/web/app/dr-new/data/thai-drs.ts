import profileSource from "../../../../../KB/dr_profile_enrichment.json";
import tradingSummarySource from "../../../../../KB/dr_historical_trading_summary.json";
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
};

const profileMap = profileSource as SourceMap<ProfileRecord>;
const tradingMap = tradingSummarySource as SourceMap<TradingRecord>;

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusFromTrading(summary: TradingRecord | undefined): ThaiDrStatus {
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

export const thaiDrs: ThaiDr[] = Object.entries(profileMap)
  .map(([symbol, profile]) => {
    const ticker = profile?.ticker ?? symbol;
    const trading = tradingMap[ticker];
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
      drPriceThb: toNumber(trading?.latest_close),
      drChangePct1d: drChangeFromOpen(trading),
      volume: toNumber(trading?.latest_volume),
      tradingValueThbM: toNumber(trading?.latest_value) === null ? null : toNumber(trading?.latest_value)! / 1_000_000,
      conversionRatio: profile?.conversion_ratio ?? null,
      officialSetPageUrl: profile?.official_quote_url ?? null,
      documents: documentUrl ? [{ label: "Documents", url: documentUrl }] : [],
      firstTradeDate: profile?.first_trade_date ?? null,
      isin: profile?.isin ?? null,
      tradingSession: profile?.trading_session ?? null,
      outstandingShare: toNumber(profile?.outstanding_share),
      outstandingDate: profile?.outstanding_date ?? null,
      status: statusFromTrading(trading),
      asOfDate: trading?.latest_date ?? null
    } satisfies ThaiDr;
  })
  .filter((dr) => dr.underlyingSymbol)
  .sort((left, right) => left.symbol.localeCompare(right.symbol));

export const thaiDrBySymbol = new Map(thaiDrs.map((dr) => [dr.symbol.toUpperCase(), dr]));
