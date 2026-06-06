import identitySource from "../../../../../KB/underlying_identity_master.json";
import fundamentalsSource from "../../../../../KB/underlying_fundamentals.json";
import profileSource from "../../../../../KB/dr_profile_enrichment.json";
import { normalizeUnderlyingSymbol } from "./underlying-aliases";
import {
  getPreferredUnderlyingHistory,
  type UnderlyingPriceHistoryRecord,
  type UnderlyingPriceRecord
} from "./underlying-price-history";
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
type ProfileRecord = {
  underlying?: string;
  underlying_name?: string;
  underlying_exchange?: string;
  underlying_url?: string;
};

const identityMap = identitySource as SourceMap<IdentityRecord>;
const fundamentalsMap = fundamentalsSource as SourceMap<FundamentalRecord>;
const profileMap = profileSource as SourceMap<ProfileRecord>;
const marketCapCurrencyPerUsd: Record<string, number> = {
  USD: 1,
  JPY: 159.73,
  HKD: 7.84,
  EUR: 0.86,
  CNY: 6.76,
  SGD: 1.28,
  VND: 26333,
  THB: 36.5,
  TWD: 32.3,
  GBP: 0.78,
  AUD: 1.5,
  CAD: 1.37,
  CHF: 0.89,
  KRW: 1370,
  DKK: 6.42
};

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

function periodReturn(prices: UnderlyingPriceRecord[], sessionsBack: number) {
  const latestRecord = prices.at(-1);
  const baseRecord = prices.length > sessionsBack ? prices.at(-(sessionsBack + 1)) : null;
  return pctChange(toNumber(latestRecord?.close), toNumber(baseRecord?.close));
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

function normalizeCurrency(value?: string | null) {
  return value?.trim().toUpperCase() || null;
}

function marketCapBaseUnits(value: number) {
  return value > 0 && value < 100_000_000 ? value * 1_000_000 : value;
}

function normalizeMarketCapUsd(value: unknown, currency?: string | null) {
  const marketCap = toNumber(value);
  if (marketCap === null) return null;
  const normalizedCurrency = normalizeCurrency(currency);
  if (!normalizedCurrency) return null;
  const currencyPerUsd = marketCapCurrencyPerUsd[normalizedCurrency];
  if (!currencyPerUsd || currencyPerUsd <= 0) return null;
  return marketCapBaseUnits(marketCap) / currencyPerUsd;
}

function sourcePriceCurrency(history: UnderlyingPriceHistoryRecord | undefined, identity: IdentityRecord | undefined) {
  return history?.currency ?? identity?.currency ?? null;
}

function fundamentalsCurrency(
  fundamentals: FundamentalRecord | undefined,
  history: UnderlyingPriceHistoryRecord | undefined,
  identity: IdentityRecord | undefined
) {
  return normalizeCurrency(fundamentals?.market_cap_currency)
    ?? normalizeCurrency(history?.currency)
    ?? normalizeCurrency(identity?.currency)
    ?? normalizeCurrency(fundamentals?.currency)
    ?? normalizeCurrency(fundamentals?.financial_currency);
}

const symbols = Array.from(new Set([
  ...Object.keys(identityMap),
  ...Object.values(profileMap).map((item) => normalizeUnderlyingSymbol(item?.underlying)).filter((value): value is string => Boolean(value))
])).sort((left, right) => left.localeCompare(right));

export const underlyings: Underlying[] = symbols.map((symbol) => {
  const identity = identityMap[symbol];
  const fundamentals = fundamentalsMap[symbol];
  const history = getPreferredUnderlyingHistory(symbol);
  const prices = history?.prices ?? [];
  const latestRecord = prices.at(-1);
  const previousRecord = prices.at(-2);
  const latestPrice = toNumber(latestRecord?.close);
  const previousPrice = toNumber(previousRecord?.close);
  const currency = sourcePriceCurrency(history, identity);
  const marketCapCurrency = fundamentalsCurrency(fundamentals, history, identity);
  const marketCap = toNumber(fundamentals?.market_cap);
  const marketCapUsd = normalizeMarketCapUsd(fundamentals?.market_cap, marketCapCurrency);
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
    underlyingChangePct1w: periodReturn(prices, 5),
    underlyingChangePct1m: periodReturn(prices, 21),
    sourceMarketVolume: toNumber(latestRecord?.volume),
    marketCap,
    marketCapCurrency,
    marketCapUsdB: marketCapUsd === null ? null : marketCapUsd / 1_000_000_000,
    pe: toNumber(fundamentals?.pe_ratio),
    pb: toNumber(fundamentals?.pb_ratio),
    dividendYieldPct: toNumber(fundamentals?.dividend_yield),
    asOfDate: history?.as_of_date ?? fundamentals?.as_of_date ?? identity?.as_of_date ?? null
  };
});

export const underlyingBySymbol = new Map(underlyings.map((underlying) => [underlying.symbol.toUpperCase(), underlying]));
