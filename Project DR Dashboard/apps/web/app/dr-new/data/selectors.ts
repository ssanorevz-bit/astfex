import { calendarEvents as baseCalendarEvents } from "./calendar-events";
import { thaiDrDividendEvents, underlyingDividendEvents } from "./dividend-events";
import { thaiDrBySymbol, thaiDrs } from "./thai-drs";
import { underlyingBySymbol, underlyings } from "./underlyings";
import { watchlistItems } from "./watchlist-items";
import type { CalendarEvent, LegacyDrNewRow, ThaiDr, Underlying } from "./types";

function countryLabel(country: string | null) {
  if (country === "HK") return "Hong Kong";
  if (country === "CN") return "China";
  if (country === "JP") return "Japan";
  if (country === "VN") return "Vietnam";
  if (country === "SG") return "Other Asia";
  if (country === "US") return "US";
  return country ?? "—";
}

function inferTheme(dr: ThaiDr, underlying: Underlying | null) {
  const corpus = `${dr.symbol} ${dr.name ?? ""} ${underlying?.name ?? ""} ${underlying?.assetClass ?? ""}`.toLowerCase();
  if (/nvda|amd|micron|avgo|semiconductor|asml|smic|jsemi|cnsemi|gsemi|chip/.test(corpus)) return "AI / Semiconductor";
  if (/msft|goog|aapl|meta|oracle|software|snow|crm|pltr/.test(corpus)) return "Software / AI";
  if (/baba|tencent|meituan|bidu|kuaish|jd|china tech|hstech/.test(corpus)) return "China Internet";
  if (/tesla|byd|catl|ev|battery|xpeng/.test(corpus)) return "EV / Auto";
  if (/lly|novo|pfizer|jnj|health|biotech|pharma/.test(corpus)) return "Healthcare";
  if (/jpm|bank|visa|mastercard|finance|financial|insurance/.test(corpus)) return "Financials";
  if (/gold|oil|silver|commodity|energy/.test(corpus)) return "Commodity";
  if (/bond|income|jepi/.test(corpus)) return "Income ETF";
  if (dr.assetType !== "Stock DR") return "Index ETF";
  return "Technology";
}

function legacyAssetType(dr: ThaiDr): LegacyDrNewRow["assetType"] {
  if (dr.assetType === "ETF DR" || dr.assetType === "Commodity DR" || dr.assetType === "Bond DR") return "ETF DR";
  if (dr.assetType === "Index DR") return "Index DR";
  return "Stock DR";
}

function scoreFor(dr: ThaiDr) {
  const trading = dr.tradingValueThbM ?? 0;
  const volume = dr.volume ?? 0;
  return Math.max(1, Math.min(99, Math.round(35 + trading * 6 + Math.log10(volume + 1) * 8)));
}

function nextEventFor(dr: ThaiDr) {
  const dividend = thaiDrDividendEvents.find((event) => event.drSymbol === dr.symbol && event.status !== "Paid");
  if (dividend?.status === "Upcoming XD") return "Dividend";
  const earnings = baseCalendarEvents.find((event) => event.underlyingSymbol === dr.underlyingSymbol && event.type === "Earnings");
  if (earnings) return "Earnings";
  if ((dr.tradingValueThbM ?? 0) < 0.05) return "Low Trading Activity";
  return "Market Event";
}

export function getUnderlyings() {
  return underlyings;
}

export function getThaiDrs() {
  return thaiDrs;
}

export function getThaiDrBySymbol(symbol: string) {
  return thaiDrBySymbol.get(symbol.toUpperCase()) ?? null;
}

export function getUnderlyingBySymbol(symbol: string) {
  return underlyingBySymbol.get(symbol.toUpperCase()) ?? null;
}

export function getThaiDrsByUnderlying(symbol: string) {
  const normalized = symbol.toUpperCase();
  return thaiDrs.filter((dr) => dr.underlyingSymbol.toUpperCase() === normalized);
}

export function toLegacyRow(dr: ThaiDr): LegacyDrNewRow {
  const underlying = getUnderlyingBySymbol(dr.underlyingSymbol);
  const sameUnderlying = getThaiDrsByUnderlying(dr.underlyingSymbol)
    .map((item) => item.symbol)
    .filter((symbol) => symbol !== dr.symbol);
  const theme = inferTheme(dr, underlying);
  const tradingValueThbM = dr.tradingValueThbM;
  return {
    ticker: dr.symbol,
    underlying: dr.underlyingSymbol,
    company: underlying?.name ?? dr.name ?? dr.underlyingSymbol,
    issuer: dr.issuerCode ?? dr.issuerName ?? "—",
    lane: (tradingValueThbM ?? 0) >= 0.1 ? "fast" : "slow",
    region: countryLabel(underlying?.country ?? null),
    theme,
    assetType: legacyAssetType(dr),
    status: dr.status,
    price: dr.drPriceThb,
    changePct: dr.drChangePct1d,
    volume: dr.volume,
    turnoverM: tradingValueThbM,
    ratio: dr.conversionRatio?.replace(/\s/g, "") ?? "—",
    pe: underlying?.pe ?? null,
    pb: underlying?.pb ?? null,
    dividendYield: underlying?.dividendYieldPct ?? null,
    marketCapB: underlying?.marketCapUsdB ?? null,
    score: scoreFor(dr),
    alert: (tradingValueThbM ?? Number.POSITIVE_INFINITY) < 0.05 ? "Low Trading Activity" : "Normal",
    sameUnderlying,
    nextEvent: nextEventFor(dr),
    officialSetPageUrl: dr.officialSetPageUrl,
    documents: dr.documents,
    firstTradeDate: dr.firstTradeDate,
    underlyingCurrency: underlying?.currency ?? null,
    underlyingPriceLocal: underlying?.priceLocal ?? null,
    underlyingChangePct1d: underlying?.underlyingChangePct1d ?? null,
    underlyingOneYearReturnPct: null,
    underlyingYtdReturnPct: null
  };
}

export const legacyDrNewRows: LegacyDrNewRow[] = thaiDrs.map(toLegacyRow);
const legacyBySymbol = new Map(legacyDrNewRows.map((row) => [row.ticker.toUpperCase(), row]));

export function getScreenerRows() {
  return legacyDrNewRows;
}

export function getSingleDrDetail(symbol: string) {
  return legacyBySymbol.get(symbol.toUpperCase()) ?? null;
}

export function getCompareSameUnderlying(symbol: string) {
  return legacyDrNewRows.filter((row) => row.underlying.toUpperCase() === symbol.toUpperCase());
}

export function getThemeCompareRows(theme: string) {
  const normalized = theme.toLowerCase();
  return legacyDrNewRows.filter((row) => row.theme.toLowerCase().includes(normalized));
}

export function getDividendCenterRows() {
  return thaiDrDividendEvents;
}

export function getCalendarEvents(): CalendarEvent[] {
  return baseCalendarEvents;
}

export function getRankingRows() {
  return legacyDrNewRows;
}

export function getWatchlistRows() {
  return watchlistItems
    .map((item) => {
      const row = legacyBySymbol.get(item.drSymbol.toUpperCase());
      return row ? { ...item, row } : null;
    })
    .filter((item): item is typeof watchlistItems[number] & { row: LegacyDrNewRow } => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getCoverageCounts() {
  const uniqueUnderlyingSymbols = new Set(thaiDrs.map((dr) => dr.underlyingSymbol));
  const underlyingPriceCoverage = [...uniqueUnderlyingSymbols].filter((symbol) => getUnderlyingBySymbol(symbol)?.priceLocal !== null).length;
  const fundamentalsCoverage = [...uniqueUnderlyingSymbols].filter((symbol) => {
    const underlying = getUnderlyingBySymbol(symbol);
    return underlying?.pe !== null || underlying?.marketCap !== null || underlying?.pb !== null;
  }).length;
  const dividendDrSymbols = new Set(thaiDrDividendEvents.map((event) => event.drSymbol));
  const earningsUnderlyings = new Set(baseCalendarEvents.filter((event) => event.type === "Earnings").map((event) => event.underlyingSymbol));
  return {
    totalThaiDrs: thaiDrs.length,
    totalUniqueUnderlyings: uniqueUnderlyingSymbols.size,
    underlyingPriceCoverage,
    fundamentalsCoverage,
    thaiDrDividendCoverage: dividendDrSymbols.size,
    earningsCoverage: earningsUnderlyings.size,
    underlyingDividendEventCount: underlyingDividendEvents.length
  };
}
