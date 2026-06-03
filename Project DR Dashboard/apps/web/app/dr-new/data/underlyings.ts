import identitySource from "../../../../../KB/underlying_identity_master.json";
import fundamentalsSource from "../../../../../KB/underlying_fundamentals.json";
import priceHistorySource from "../../../../../KB/underlying_price_history.json";
import profileSource from "../../../../../KB/dr_profile_enrichment.json";
import { normalizeUnderlyingSymbol } from "./underlying-aliases";
import type { AssetClass, Underlying } from "./types";

type SourceMap<T> = Record<string, T | undefined>;
type IdentityRecord = {
  underlying_symbol?: string;
  company_name?: string;
  exchange?: string;
  mic?: string;
  country?: string;
  currency?: string;
  security_type?: string;
  primary_listing_url?: string;
  yahoo_symbol?: string;
  tradingview_symbol?: string;
  as_of_date?: string;
};
type FundamentalRecord = {
  market_cap?: string;
  currency?: string;
  financial_currency?: string;
  market_cap_currency?: string;
  pe_ratio?: string;
  pb_ratio?: string;
  dividend_yield?: string;
  as_of_date?: string;
};
type PriceRecord = {
  date?: string;
  close?: string;
  volume?: string;
};
type PriceHistoryRecord = {
  currency?: string;
  exchange?: string;
  as_of_date?: string;
  prices?: PriceRecord[];
};
type ProfileRecord = {
  underlying?: string;
  underlying_name?: string;
  underlying_exchange?: string;
  underlying_url?: string;
};

const identityMap = identitySource as SourceMap<IdentityRecord>;
const fundamentalsMap = fundamentalsSource as SourceMap<FundamentalRecord>;
const priceHistoryMap = priceHistorySource as SourceMap<PriceHistoryRecord>;
const profileMap = profileSource as SourceMap<ProfileRecord>;

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pctChange(latest: number | null, previous: number | null) {
  if (latest === null || previous === null || previous === 0) return null;
  return ((latest - previous) / previous) * 100;
}

function assetClass(securityType?: string): AssetClass {
  const value = (securityType ?? "").toLowerCase();
  if (value.includes("etf")) return "ETF";
  if (value.includes("index")) return "Index";
  if (value.includes("bond")) return "Bond";
  if (value.includes("commodity")) return "Commodity";
  if (value.includes("stock") || value.includes("common")) return "Stock";
  return "Other";
}

function fallbackName(symbol: string) {
  const profile = Object.values(profileMap).find((item) => normalizeUnderlyingSymbol(item?.underlying) === symbol);
  return profile?.underlying_name?.replace(/^บริษัท\s+/u, "").replace(/\s*\([^)]*\)\s*$/u, "") ?? symbol;
}

const FX_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  JPY: 159.73,
  HKD: 7.84,
  EUR: 0.86,
  CNY: 6.76,
  SGD: 1.28,
  VND: 26333.0
};

function normalizeMarketCapUsd(value: unknown, currency: string | null) {
  const raw = toNumber(value);
  if (raw === null) return null;
  
  let localValue = raw;
  if (raw >= 1 && raw < 100_000_000) {
    localValue = raw * 1_000_000;
  }
  
  const currencyKey = (currency ?? "USD").toUpperCase();
  const rate = FX_RATES_TO_USD[currencyKey];
  if (!rate) return null; // Unsupported currency
  
  return localValue / rate;
}

function sourcePriceCurrency(history: PriceHistoryRecord | undefined, identity: IdentityRecord | undefined) {
  return history?.currency ?? identity?.currency ?? null;
}

function fundamentalsCurrency(
  fundamentals: FundamentalRecord | undefined,
  history: PriceHistoryRecord | undefined,
  identity: IdentityRecord | undefined
) {
  return fundamentals?.market_cap_currency
    ?? fundamentals?.financial_currency
    ?? fundamentals?.currency
    ?? history?.currency
    ?? identity?.currency
    ?? null;
}

const symbols = Array.from(new Set([
  ...Object.keys(identityMap),
  ...Object.values(profileMap).map((item) => normalizeUnderlyingSymbol(item?.underlying)).filter((value): value is string => Boolean(value))
])).sort((left, right) => left.localeCompare(right));

export const underlyings: Underlying[] = symbols.map((symbol) => {
  const identity = identityMap[symbol];
  const fundamentals = fundamentalsMap[symbol];
  const history = priceHistoryMap[symbol];
  const prices = history?.prices ?? [];
  const latestPrice = toNumber(prices[0]?.close);
  const previousPrice = toNumber(prices[1]?.close);
  const currency = sourcePriceCurrency(history, identity);
  const marketCapCurrency = fundamentalsCurrency(fundamentals, history, identity);
  const marketCap = normalizeMarketCapUsd(fundamentals?.market_cap, marketCapCurrency);
  const fallbackProfile = Object.values(profileMap).find((item) => normalizeUnderlyingSymbol(item?.underlying) === symbol);

  return {
    symbol,
    name: identity?.company_name ?? fallbackName(symbol),
    country: identity?.country ?? null,
    exchange: identity?.exchange ?? history?.exchange ?? fallbackProfile?.underlying_exchange ?? null,
    mic: identity?.mic ?? null,
    currency,
    assetClass: assetClass(identity?.security_type),
    sector: null,
    industry: null,
    themes: [],
    primaryListingUrl: identity?.primary_listing_url ?? fallbackProfile?.underlying_url ?? null,
    tradingViewSymbol: identity?.tradingview_symbol ?? null,
    yahooSymbol: identity?.yahoo_symbol ?? null,
    priceLocal: latestPrice,
    underlyingChangePct1d: pctChange(latestPrice, previousPrice),
    sourceMarketVolume: toNumber(prices[0]?.volume),
    marketCap,
    marketCapUsdB: marketCap === null ? null : marketCap / 1_000_000_000,
    pe: toNumber(fundamentals?.pe_ratio),
    pb: toNumber(fundamentals?.pb_ratio),
    dividendYieldPct: toNumber(fundamentals?.dividend_yield),
    asOfDate: history?.as_of_date ?? fundamentals?.as_of_date ?? identity?.as_of_date ?? null
  };
});

export const underlyingBySymbol = new Map(underlyings.map((underlying) => [underlying.symbol.toUpperCase(), underlying]));
