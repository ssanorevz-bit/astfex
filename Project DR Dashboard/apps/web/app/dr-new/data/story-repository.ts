import curatedStorySource from "../../../../../KB/dr_business_summary.json";
import underlyingBusinessProfileSource from "../../../../../KB/underlying_business_profile.json";
import underlyingIdentitySource from "../../../../../KB/underlying_identity_master.json";
import { thaiDrs } from "./thai-drs";

type CuratedStoryRecord = {
  company_name?: string;
  dr_available?: string[];
  business_summary?: string;
  investment_thesis?: string[];
  themes?: string[];
  last_updated?: string;
};

type UnderlyingBusinessProfileRecord = {
  underlying_symbol?: string;
  company_name?: string;
  business_summary?: string;
  source?: string;
  as_of_date?: string;
  updated_at?: string;
};

type UnderlyingIdentityRecord = {
  underlying_symbol?: string;
  company_name?: string;
  exchange?: string;
  as_of_date?: string;
  updated_at?: string;
};

export type StoryCurationLevel = "curated_thai" | "fallback_profile" | "missing";

export type NormalizedUnderlyingStory = {
  symbol: string;
  companyName: string;
  businessOneLinerTH: string | null;
  whyThisCompanyMattersTH: string | null;
  signatureInsightTH: string | null;
  curationLevel: StoryCurationLevel;
  themes: string[];
  drTicker: string | null;
  drRoute: string | null;
  exchange: string | null;
  sourceName: "dr_business_summary" | "underlying_business_profile" | "missing";
  updatedAt: string | null;
};

const curatedStoryMap = curatedStorySource as Record<string, CuratedStoryRecord | undefined>;
const underlyingBusinessProfileMap = underlyingBusinessProfileSource as Record<string, UnderlyingBusinessProfileRecord | undefined>;
const underlyingIdentityMap = underlyingIdentitySource as Record<string, UnderlyingIdentityRecord | undefined>;

const drTickersByUnderlying = new Map<string, string[]>();

for (const dr of thaiDrs) {
  const key = dr.underlyingSymbol.toUpperCase();
  const existing = drTickersByUnderlying.get(key);
  if (existing) {
    existing.push(dr.symbol);
  } else {
    drTickersByUnderlying.set(key, [dr.symbol]);
  }
}

function preferDrTicker(symbol: string, curatedDrTickers: string[] | undefined) {
  const availableTickers = drTickersByUnderlying.get(symbol.toUpperCase()) ?? [];
  const availableSet = new Set(availableTickers.map((ticker) => ticker.toUpperCase()));

  for (const ticker of curatedDrTickers ?? []) {
    if (availableSet.has(ticker.toUpperCase())) return ticker;
  }

  return availableTickers[0] ?? null;
}

export function getUnderlyingStory(symbol: string): NormalizedUnderlyingStory {
  const normalizedSymbol = symbol.toUpperCase();
  const curatedStory = curatedStoryMap[normalizedSymbol];
  const profile = underlyingBusinessProfileMap[normalizedSymbol];
  const identity = underlyingIdentityMap[normalizedSymbol];
  const drTicker = preferDrTicker(normalizedSymbol, curatedStory?.dr_available);

  if (curatedStory?.business_summary) {
    return {
      symbol: normalizedSymbol,
      companyName: curatedStory.company_name ?? profile?.company_name ?? identity?.company_name ?? normalizedSymbol,
      businessOneLinerTH: curatedStory.business_summary,
      whyThisCompanyMattersTH: curatedStory.investment_thesis?.[0] ?? null,
      signatureInsightTH: curatedStory.investment_thesis?.[0] ?? null,
      curationLevel: "curated_thai",
      themes: curatedStory.themes ?? [],
      drTicker,
      drRoute: drTicker ? `/dr-new/${drTicker}` : null,
      exchange: identity?.exchange ?? null,
      sourceName: "dr_business_summary",
      updatedAt: curatedStory.last_updated ?? null
    };
  }

  if (profile?.business_summary) {
    return {
      symbol: normalizedSymbol,
      companyName: profile.company_name ?? identity?.company_name ?? normalizedSymbol,
      businessOneLinerTH: profile.business_summary,
      whyThisCompanyMattersTH: null,
      signatureInsightTH: null,
      curationLevel: "fallback_profile",
      themes: curatedStory?.themes ?? [],
      drTicker,
      drRoute: drTicker ? `/dr-new/${drTicker}` : null,
      exchange: identity?.exchange ?? null,
      sourceName: "underlying_business_profile",
      updatedAt: profile.updated_at ?? profile.as_of_date ?? null
    };
  }

  return {
    symbol: normalizedSymbol,
    companyName: curatedStory?.company_name ?? profile?.company_name ?? identity?.company_name ?? normalizedSymbol,
    businessOneLinerTH: null,
    whyThisCompanyMattersTH: null,
    signatureInsightTH: null,
    curationLevel: "missing",
    themes: curatedStory?.themes ?? [],
    drTicker,
    drRoute: drTicker ? `/dr-new/${drTicker}` : null,
    exchange: identity?.exchange ?? null,
    sourceName: "missing",
    updatedAt: profile?.updated_at ?? profile?.as_of_date ?? identity?.updated_at ?? identity?.as_of_date ?? null
  };
}
