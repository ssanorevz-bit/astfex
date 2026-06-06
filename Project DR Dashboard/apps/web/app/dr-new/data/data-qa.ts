import { calendarEventQa, calendarEvents } from "./calendar-events";
import fundamentalsSource from "../../../../../KB/underlying_fundamentals.json";
import identitySource from "../../../../../KB/underlying_identity_master.json";
import priceHistorySource from "../../../../../KB/underlying_price_history.json";
import { thaiDrDividendEvents, underlyingDividendEvents } from "./dividend-events";
import { thaiDrs } from "./thai-drs";
import { normalizeUnderlyingSymbol, underlyingSymbolAliases } from "./underlying-aliases";
import { underlyingBySymbol } from "./underlyings";

type SourceMap<T> = Record<string, T | undefined>;
type IdentityRecord = {
  currency?: string;
};
type PriceHistoryRecord = {
  currency?: string;
};
type FundamentalRecord = {
  market_cap?: string;
  currency?: string;
  financial_currency?: string;
  market_cap_currency?: string;
};

const identityMap = identitySource as SourceMap<IdentityRecord>;
const priceHistoryMap = priceHistorySource as SourceMap<PriceHistoryRecord>;
const fundamentalsMap = fundamentalsSource as SourceMap<FundamentalRecord>;

function marketCapCurrency(symbol: string) {
  const fundamentals = fundamentalsMap[symbol];
  return fundamentals?.market_cap_currency
    ?? fundamentals?.financial_currency
    ?? fundamentals?.currency
    ?? priceHistoryMap[symbol]?.currency
    ?? identityMap[symbol]?.currency
    ?? null;
}

function sourcePriceCurrency(symbol: string) {
  return priceHistoryMap[symbol]?.currency ?? identityMap[symbol]?.currency ?? null;
}

function duplicateIds(rows: Array<{ id: string }>) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.id, (counts.get(row.id) ?? 0) + 1));
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));
}

export function getDataQaReport() {
  const uniqueUnderlyings = Array.from(new Set(thaiDrs.map((dr) => dr.underlyingSymbol)));
  const aliasTargets = new Set(Object.values(underlyingSymbolAliases));
  const drsWithAliasResolvedUnderlying = thaiDrs.filter((dr) => aliasTargets.has(dr.underlyingSymbol));
  const thaiDrDividendSymbols = new Set(thaiDrDividendEvents.map((event) => event.drSymbol));
  const earningsUnderlyings = new Set(calendarEvents.filter((event) => event.type === "Earnings").map((event) => event.underlyingSymbol));
  const stockUnderlyings = uniqueUnderlyings.filter((symbol) => underlyingBySymbol.get(symbol.toUpperCase())?.assetClass === "Stock");
  const nonStockUnderlyings = uniqueUnderlyings.filter((symbol) => underlyingBySymbol.get(symbol.toUpperCase())?.assetClass !== "Stock");
  const duplicateThaiDrDividendIds = duplicateIds(thaiDrDividendEvents);
  const duplicateCalendarEventIds = duplicateIds(calendarEvents);
  const marketCapRankingExclusions = uniqueUnderlyings
    .filter((symbol) => fundamentalsMap[symbol]?.market_cap && underlyingBySymbol.get(symbol.toUpperCase())?.marketCapUsdB === null)
    .map((symbol) => ({
      symbol,
      currency: marketCapCurrency(symbol),
      rawMarketCap: fundamentalsMap[symbol]?.market_cap ?? null
    }));
  const vietnamSymbols = uniqueUnderlyings.filter((symbol) => underlyingBySymbol.get(symbol.toUpperCase())?.exchange === "Hochiminh Stock Exchange" || priceHistoryMap[symbol]?.currency === "VND");

  return {
    totalThaiDrs: thaiDrs.length,
    uniqueUnderlyings: uniqueUnderlyings.length,
    priceCoverage: uniqueUnderlyings.filter((symbol) => underlyingBySymbol.get(symbol.toUpperCase())?.priceLocal !== null).length,
    fundamentalsCoverage: uniqueUnderlyings.filter((symbol) => {
      const underlying = underlyingBySymbol.get(symbol.toUpperCase());
      return underlying?.pe !== null || underlying?.pb !== null || underlying?.marketCapUsdB !== null || underlying?.dividendYieldPct !== null;
    }).length,
    thaiDrDividendCoverage: thaiDrDividendSymbols.size,
    underlyingDividendCoverage: underlyingDividendEvents.length,
    earningsCoverage: earningsUnderlyings.size,
    stockEarningsCoverage: stockUnderlyings.filter((symbol) => earningsUnderlyings.has(symbol)).length,
    totalStockUnderlyings: stockUnderlyings.length,
    nonStockEarningsCoverage: nonStockUnderlyings.filter((symbol) => earningsUnderlyings.has(symbol)).length,
    totalNonStockUnderlyings: nonStockUnderlyings.length,
    calendarEarningsIncluded: calendarEventQa.earningsEventIncludedCount,
    calendarEarningsSkipped: calendarEventQa.earningsEventSkippedCount,
    calendarSkippedEarningsExamples: calendarEventQa.skippedEarningsExamples,
    duplicateThaiDrDividendIdCount: duplicateThaiDrDividendIds.length,
    duplicateThaiDrDividendIdExamples: duplicateThaiDrDividendIds.slice(0, 20),
    duplicateCalendarEventIdCount: duplicateCalendarEventIds.length,
    duplicateCalendarEventIdExamples: duplicateCalendarEventIds.slice(0, 20),
    aliasResolvedJoins: drsWithAliasResolvedUnderlying.length,
    aliases: {
      "JEPI ETF": normalizeUnderlyingSymbol("JEPI ETF")
    },
    missingPriceExamples: uniqueUnderlyings
      .filter((symbol) => underlyingBySymbol.get(symbol.toUpperCase())?.priceLocal === null)
      .slice(0, 20),
    missingFundamentalsExamples: uniqueUnderlyings
      .filter((symbol) => {
        const underlying = underlyingBySymbol.get(symbol.toUpperCase());
        return underlying?.pe === null && underlying?.pb === null && underlying?.marketCapUsdB === null && underlying?.dividendYieldPct === null;
      })
      .slice(0, 20),
    missingEarningsExamples: uniqueUnderlyings
      .filter((symbol) => !earningsUnderlyings.has(symbol))
      .slice(0, 20),
    stockMissingEarningsExamples: stockUnderlyings
      .filter((symbol) => !earningsUnderlyings.has(symbol))
      .slice(0, 20),
    marketCapRankingExclusionsByCurrency: marketCapRankingExclusions.reduce<Record<string, number>>((acc, item) => {
      const key = item.currency ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    marketCapRankingExclusionExamples: marketCapRankingExclusions.slice(0, 20),
    vietnamCurrencySanity: vietnamSymbols.map((symbol) => ({
      symbol,
      displayCurrency: underlyingBySymbol.get(symbol.toUpperCase())?.currency ?? null,
      priceHistoryCurrency: sourcePriceCurrency(symbol),
      marketCapCurrency: marketCapCurrency(symbol),
      hasMarketCapUsd: underlyingBySymbol.get(symbol.toUpperCase())?.marketCapUsdB !== null
    }))
  };
}
