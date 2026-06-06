"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import businessProfileSource from "../../../../../KB/underlying_business_profile.json";
import { getDrNewProfile } from "../dr-new-derived";
import {
  drAssetTypeFilters,
  drCountryFilters,
  drThemeFilters,
  getTaxonomyAssetType,
  getTaxonomyCountry,
  getTaxonomyThemes,
  type DrAssetTypeFilter,
  type DrCountryFilter,
  type DrThemeFilter
} from "../dr-taxonomy";
import type { DrNewRow } from "../mock-dr-new-data";
import { formatUnderlyingPrice, getUnderlyingEodQuote, type UnderlyingEodQuote } from "../underlying-eod-quotes";

type UnderlyingRow = {
  symbol: string;
  company: string;
  country: CountryFilter;
  sector: string;
  broadSector: string;
  theme: string;
  themes: ThemeFilter[];
  assetCategory: AssetTypeFilter;
  intelligenceTags: string[];
  assetType: DrNewRow["assetType"];
  quote: UnderlyingEodQuote | null;
  pe: number | null;
  marketCapB: number | null;
  dividendYield: number | null;
  turnoverM: number | null;
  drs: DrNewRow[];
};
type BusinessProfileRecord = {
  logo_url?: string;
};
type BusinessProfileMap = Record<string, BusinessProfileRecord | undefined>;

type CountryFilter = DrCountryFilter;
type ThemeFilter = DrThemeFilter;
type AssetTypeFilter = DrAssetTypeFilter;
type SortKey = "gainers" | "losers" | "marketCap" | "pe" | "drAvailable";
type SearchSuggestionKind = "underlying" | "dr" | "theme" | "country" | "assetType";
type SearchSuggestion = {
  id: string;
  label: string;
  meta: string;
  query: string;
  kind: SearchSuggestionKind;
  underlyingSymbol?: string;
  theme?: ThemeFilter;
  country?: CountryFilter;
  assetType?: AssetTypeFilter;
};
type DrListingRow = DrNewRow & {
  liquidityShare: number;
  isMostLiquid: boolean;
};
type DrHeatMapTile = {
  ticker: string;
  company: string;
  underlying: string;
  issuer: string;
  changePct: number | null;
  tradingValueM: number | null;
  marketCapB: number | null;
  sizeSource: "tradingValue" | "marketCap" | "minimum";
  sizeValue: number;
};
type DrHeatMapRect = DrHeatMapTile & {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type ScreenerInitialFilters = {
  country?: string | null;
  theme?: string | null;
  assetType?: string | null;
  query?: string | null;
  sort?: string | null;
};

const countryFilters = drCountryFilters;

const countryMetaByLabel = new Map(countryFilters.map((country) => [country.label, country]));

const themeFilters = drThemeFilters;
const themeMetaByLabel = new Map(themeFilters.map((theme) => [theme.label, theme]));

const assetTypeFilters = drAssetTypeFilters;
const sortOptions: Array<{ label: string; value: SortKey; helper: string }> = [
  { label: "Market Cap", value: "marketCap", helper: "Market cap" },
  { label: "Gainers", value: "gainers", helper: "Up 1D" },
  { label: "Losers", value: "losers", helper: "Down 1D" },
  { label: "Valuation", value: "pe", helper: "Low P/E" },
  { label: "DR Listings", value: "drAvailable", helper: "Issuer choices" }
];
const countryFilterValues = new Set<CountryFilter>(countryFilters.map((country) => country.value));
const themeFilterValues = new Set<ThemeFilter>(themeFilters.map((theme) => theme.label));
const assetTypeFilterValues = new Set<AssetTypeFilter>(assetTypeFilters);
const sortKeyValues = new Set<SortKey>(sortOptions.map((option) => option.value));
const businessProfileMap = businessProfileSource as BusinessProfileMap;
const canonicalUnderlyingSymbols: Record<string, string> = {
  GOOG: "GOOGL"
};
const preferredCountryOrder: CountryFilter[] = ["US", "China", "Japan", "Hong Kong", "Singapore", "Vietnam", "Taiwan", "Europe", "Other"];
const primaryCountryCount = 6;
const themeGroupDefinitions: Array<{ title: string; themes: ThemeFilter[] }> = [
  {
    title: "Growth & Technology",
    themes: ["AI & Semiconductor", "Mega Cap Tech", "Cloud & Software", "China Tech", "E-commerce & Platform", "Gaming & Entertainment"]
  },
  {
    title: "Defensive & Income",
    themes: ["Healthcare", "Finance", "Consumer & Lifestyle", "Index ETF", "Bond & Income"]
  },
  {
    title: "Cyclical & Real Assets",
    themes: ["Energy & Utilities", "Materials & Commodity", "Commodity ETF", "EV & Battery", "Luxury", "Travel & Leisure"]
  },
  {
    title: "Regional / Market Access",
    themes: ["Japan Leaders", "Vietnam", "Other / Diversified"]
  }
];
const popularThemeFallbackOrder: ThemeFilter[] = [
  "AI & Semiconductor",
  "Finance",
  "China Tech",
  "Japan Leaders",
  "Consumer & Lifestyle",
  "Healthcare"
];

function requestedLogoPath(country: string, fileName: string) {
  return `/dr-screener-logos/${encodeURIComponent(country)}/${encodeURIComponent(fileName)}`;
}

function symbolLogoPath(fileName: string) {
  return `/dr-screener-symbol-logos/${encodeURIComponent(fileName)}`;
}

const requestedLogoBySymbol: Partial<Record<string, string>> = {
  AAPL: requestedLogoPath("US", "Apple.png"),
  AMD: requestedLogoPath("US", "AMD.png"),
  AMZN: requestedLogoPath("US", "Amazon.png"),
  CRWD: requestedLogoPath("US", "CrowdStrike.png"),
  DASH: requestedLogoPath("US", "DoorDash.png"),
  GOOGL: requestedLogoPath("US", "Alphabet (Google).png"),
  HOOD: requestedLogoPath("US", "Robinhood.png"),
  INTEL: requestedLogoPath("US", "Intel.png"),
  IONQ: requestedLogoPath("US", "IonQ.png"),
  JNJ: requestedLogoPath("US", "Johnson & Johnson.png"),
  JPMUS: requestedLogoPath("US", "JPMorgan.png"),
  KO: requestedLogoPath("US", "Coca-Cola.png"),
  LRCX: requestedLogoPath("US", "Lam Research.png"),
  MA: requestedLogoPath("US", "Mastercard.png"),
  META: requestedLogoPath("US", "Meta.png"),
  MICRON: requestedLogoPath("US", "Micron.png"),
  MRVL: requestedLogoPath("US", "Marvell.png"),
  MS: requestedLogoPath("US", "Morgan Stanley.png"),
  MSFT: requestedLogoPath("US", "Microsoft.png"),
  NET: requestedLogoPath("US", "Cloudflare.png"),
  NFLX: requestedLogoPath("US", "Netflix.png"),
  NIKE: requestedLogoPath("US", "Nike.png"),
  NOW: requestedLogoPath("US", "ServiceNow.png"),
  NVDA: requestedLogoPath("US", "NVIDIA.png"),
  ORCL: requestedLogoPath("US", "Oracle.png"),
  PANW: requestedLogoPath("US", "Palo Alto Networks.png"),
  PLTR: requestedLogoPath("US", "Palantir.png"),
  QCOM: requestedLogoPath("US", "Qualcomm.png"),
  RKLB: requestedLogoPath("US", "Rocket Lab.png"),
  SNOW: requestedLogoPath("US", "Snowflake.png"),
  SPOT: requestedLogoPath("US", "Spotify.png"),
  TSLA: requestedLogoPath("US", "Tesla.png"),
  UBER: requestedLogoPath("US", "Uber.png"),
  UNH: requestedLogoPath("US", "UnitedHealth.png"),
  BABA: requestedLogoPath("Hong Kong", "Alibaba.png"),
  BYD: requestedLogoPath("China", "BYD.png"),
  BYDCOM: requestedLogoPath("China", "BYD.png"),
  CATL: requestedLogoPath("China", "CATL.png"),
  CMBANK: requestedLogoPath("Hong Kong", "China Merchants Bank.png"),
  GEELY: requestedLogoPath("Hong Kong", "Geely.png"),
  HKEX: requestedLogoPath("Hong Kong", "Hong Kong Exchanges (HKEX).png"),
  ICBC: requestedLogoPath("Hong Kong", "ICBC.png"),
  JD: requestedLogoPath("Hong Kong", "JD.com.png"),
  KUAISH: requestedLogoPath("Hong Kong", "Kuaishou.png"),
  MEITUAN: requestedLogoPath("Hong Kong", "Meituan.png"),
  MOUTAI: requestedLogoPath("China", "Kweichow Moutai.png"),
  PETROCN: requestedLogoPath("Hong Kong", "PetroChina.png"),
  PINGAN: requestedLogoPath("Hong Kong", "Ping An Insurance.png"),
  SMIC: requestedLogoPath("China", "SMIC.png"),
  TENCENT: requestedLogoPath("Hong Kong", "Tencent.png"),
  FANUC: requestedLogoPath("Japan", "Fanuc.png"),
  HITACHI: requestedLogoPath("Japan", "Hitachi.png"),
  HONDA: requestedLogoPath("Japan", "Honda.png"),
  ITOCHU: requestedLogoPath("Japan", "Itochu.png"),
  KEYENCE: requestedLogoPath("Japan", "Keyence.png"),
  KIOXIA: requestedLogoPath("Japan", "Kioxia.png"),
  KONAMI: requestedLogoPath("Japan", "Konami.png"),
  NINTENDO: requestedLogoPath("Japan", "Nintendo.png"),
  SANRIO: requestedLogoPath("Japan", "Sanrio.png"),
  SOFTBANK: requestedLogoPath("Japan", "SoftBank Group.png"),
  SONY: requestedLogoPath("Japan", "Sony.png"),
  TOYOTA: requestedLogoPath("Japan", "Toyota.png"),
  DBS: requestedLogoPath("Singapore", "DBS Group.png"),
  SIA: requestedLogoPath("Singapore", "Singapore Airlines.png"),
  SGX: requestedLogoPath("Singapore", "Singapore Exchange.png"),
  SINGTEL: requestedLogoPath("Singapore", "Singtel.png"),
  THAIBEV: requestedLogoPath("Singapore", "Thai Beverage.png"),
  FPTVN: requestedLogoPath("Vietnam", "FPT.png"),
  HPG: requestedLogoPath("Vietnam", "Hoa Phat.png"),
  MSN: requestedLogoPath("Vietnam", "Masan Group.png"),
  MWG: requestedLogoPath("Vietnam", "Mobile World.png"),
  GAS: requestedLogoPath("Vietnam", "PV Gas.png")
};

const symbolLogoFileBySymbol: Partial<Record<string, string>> = {
  AAPL: "AAPL.png",
  AMD: "AMD.png",
  AMZN: "AMZN.png",
  BABA: "BABA.png",
  GOOGL: "GOOG.png",
  INTC: "INTC.png",
  JNJ: "JNJ.png",
  JPMUS: "JPM.png",
  KO: "KO.png",
  LRCX: "LRCX.png",
  MA: "MA.png",
  META: "META.png",
  MICRON: "MU.png",
  MRVL: "MRVL.png",
  MS: "MS.png",
  MSFT: "MSFT.png",
  NFLX: "NFLX.png",
  NVDA: "NVDA.png",
  ORCL: "ORCL.png",
  PANW: "PANW.png",
  PLTR: "PLTR.png",
  QCOM: "QCOM.png",
  SNOW: "SNOW.png",
  SPOT: "SPOT.png",
  TENCENT: "TCEHY.png",
  TSLA: "TSLA.png",
  TOYOTA: "TM.png",
  UNH: "UNH.png"
};

function logoCandidates(symbol: string) {
  const candidates = [
    requestedLogoBySymbol[symbol],
    symbolLogoPath(`${symbol}.png`),
    symbolLogoFileBySymbol[symbol] ? symbolLogoPath(symbolLogoFileBySymbol[symbol]!) : null,
    businessProfileMap[symbol]?.logo_url ?? null
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}T`;
  return `$${value.toLocaleString("en-US")}B`;
}

function formatDrPrice(value: number | null) {
  if (value === null) return "—";
  return `THB ${value.toFixed(2)}`;
}

function formatDrTradingValue(value: number | null) {
  if (value === null) return "—";
  if (value >= 1) return `THB ${value.toFixed(2)}M`;
  return `THB ${(value * 1000).toFixed(0)}K`;
}

function heatMapTone(value: number | null) {
  if (value === null) return "flat";
  if (value > 5) return "darkGreen";
  if (value >= 2) return "green";
  if (value >= 0) return "lightGreen";
  if (value > -2) return "lightRed";
  if (value >= -5) return "red";
  return "darkRed";
}

function splitTreemap(items: DrHeatMapTile[], rect: { x: number; y: number; width: number; height: number }): DrHeatMapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0]!, ...rect }];

  const total = items.reduce((sum, item) => sum + item.sizeValue, 0);
  const target = total / 2;
  let running = 0;
  let splitIndex = 0;

  for (let index = 0; index < items.length - 1; index += 1) {
    const nextRunning = running + items[index]!.sizeValue;
    if (Math.abs(target - nextRunning) <= Math.abs(target - running)) {
      running = nextRunning;
      splitIndex = index + 1;
      continue;
    }
    break;
  }

  if (splitIndex <= 0) splitIndex = 1;

  const first = items.slice(0, splitIndex);
  const second = items.slice(splitIndex);
  const firstTotal = first.reduce((sum, item) => sum + item.sizeValue, 0);
  const ratio = total > 0 ? firstTotal / total : 0.5;

  if (rect.width >= rect.height) {
    const firstWidth = rect.width * ratio;
    return [
      ...splitTreemap(first, { ...rect, width: firstWidth }),
      ...splitTreemap(second, { x: rect.x + firstWidth, y: rect.y, width: rect.width - firstWidth, height: rect.height })
    ];
  }

  const firstHeight = rect.height * ratio;
  return [
    ...splitTreemap(first, { ...rect, height: firstHeight }),
    ...splitTreemap(second, { x: rect.x, y: rect.y + firstHeight, width: rect.width, height: rect.height - firstHeight })
  ];
}

function buildDrHeatMap(underlyings: UnderlyingRow[]) {
  const tiles = underlyings
    .flatMap((row) =>
      row.drs.map((dr) => {
        const tradingValueM = dr.turnoverM ?? null;
        const marketCapB = row.marketCapB ?? null;
        const hasTradingValue = tradingValueM !== null && tradingValueM > 0;
        const hasMarketCap = marketCapB !== null && marketCapB > 0;
        const sizeSource = hasTradingValue ? "tradingValue" : hasMarketCap ? "marketCap" : "minimum";
        const sizeValue = hasTradingValue
          ? tradingValueM
          : hasMarketCap
            ? marketCapB * 0.002
            : 0.08;

        return {
          ticker: dr.ticker,
          company: row.company,
          underlying: row.symbol,
          issuer: dr.issuer,
          changePct: dr.changePct,
          tradingValueM,
          marketCapB,
          sizeSource,
          sizeValue
        } satisfies DrHeatMapTile;
      })
    )
    .sort((left, right) => right.sizeValue - left.sizeValue);

  return splitTreemap(tiles, { x: 0, y: 0, width: 100, height: 100 });
}

function heatMapTileSizeClass(tile: DrHeatMapRect) {
  const area = tile.width * tile.height;
  if (area >= 165) return "hero";
  if (area >= 96) return "large";
  if (area >= 44) return "medium";
  return "small";
}

function ratioCompactText(ratio: string) {
  return ratio.replace(/\s/g, "");
}

function sortNumber(value: number | null) {
  return value ?? Number.NEGATIVE_INFINITY;
}

function corpusFor(symbol: string, drs: DrNewRow[], profile: { industry: string; sector: string }) {
  return [
    symbol,
    profile.industry,
    profile.sector,
    ...drs.flatMap((dr) => [dr.ticker, dr.underlying, dr.company, dr.theme, dr.assetType])
  ].join(" ").toLowerCase();
}

function themeMeta(theme: ThemeFilter) {
  return themeMetaByLabel.get(theme) ?? { label: theme, icon: "" };
}

function themeCount(theme: ThemeFilter, counts: Map<ThemeFilter, number>) {
  return counts.get(theme) ?? 0;
}

function FilterChip({
  active,
  count,
  disabled,
  icon,
  label,
  title,
  onClick
}: {
  active?: boolean;
  count?: number;
  disabled?: boolean;
  icon?: string;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
      {count !== undefined ? <small>{count}</small> : null}
    </button>
  );
}

function getRowThemes(symbol: string, drs: DrNewRow[], profile: { industry: string; sector: string }) {
  return getTaxonomyThemes({
    underlying: symbol,
    corpus: corpusFor(symbol, drs, profile),
    assetType: drs[0]?.assetType,
    region: drs[0]?.region,
    underlyingCurrency: drs[0]?.underlyingCurrency
  });
}

function getAssetCategory(drs: DrNewRow[]): AssetTypeFilter {
  return getTaxonomyAssetType({
    underlying: drs[0]?.underlying,
    region: drs[0]?.region,
    assetType: drs[0]?.assetType,
    underlyingCurrency: drs[0]?.underlyingCurrency,
    corpus: [
      ...drs.flatMap((dr) => [dr.ticker, dr.theme, dr.assetType])
    ].join(" ")
  });
}

function getIntelligenceTags(row: Pick<UnderlyingRow, "themes" | "marketCapB" | "pe" | "dividendYield" | "assetCategory">) {
  const tags: string[] = [];
  if ((row.marketCapB ?? 0) >= 200) tags.push("Mega Cap");
  if ((row.pe ?? 0) >= 30 || row.themes.some((theme) => ["AI & Semiconductor", "Cloud & Software", "EV & Battery", "Mega Cap Tech", "China Tech"].includes(theme))) tags.push("Growth");
  if ((row.dividendYield ?? 0) >= 2 || row.assetCategory === "Bond") tags.push("Dividend");
  if (row.themes.includes("AI & Semiconductor")) tags.push("AI Boom");
  if (row.themes.includes("China Tech")) tags.push("China Recovery");
  if (row.assetCategory === "Bond" || row.themes.includes("Finance")) tags.push("Rate Cut");
  if (row.themes.includes("Energy & Utilities")) tags.push("Nuclear");
  return tags.slice(0, 4);
}

function countryMeta(row: UnderlyingRow) {
  return countryMetaByLabel.get(row.country) ?? { label: row.country, value: row.country, flag: "" };
}

function countryLabel(row: UnderlyingRow) {
  return countryMeta(row).label;
}

function normalizedTokens(query: string) {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function searchCorpus(row: UnderlyingRow) {
  return [
    row.symbol,
    row.company,
    row.country,
    countryLabel(row),
    row.sector,
    row.broadSector,
    row.assetCategory,
    ...row.themes,
    ...row.intelligenceTags,
    ...row.drs.flatMap((dr) => [dr.ticker, dr.company, dr.issuer, dr.theme, dr.assetType])
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearchQuery(row: UnderlyingRow, query: string) {
  const tokens = normalizedTokens(query);
  if (tokens.length === 0) return true;
  const corpus = searchCorpus(row);
  return tokens.every((token) => corpus.includes(token));
}

function matchesCountryFilter(row: UnderlyingRow, filter: CountryFilter | null) {
  if (filter === null) return true;
  return countryMeta(row).label === filter;
}

function buildUnderlyingRows(rows: DrNewRow[]) {
  const groups = new Map<string, DrNewRow[]>();
  rows.forEach((row) => {
    const canonical = canonicalUnderlyingSymbols[row.underlying] ?? row.underlying;
    groups.set(canonical, [...(groups.get(canonical) ?? []), row]);
  });

  return Array.from(groups.entries()).map(([symbol, drs]): UnderlyingRow => {
    const first = drs.find((dr) => dr.underlying === symbol) ?? drs[0];
    const profile = getDrNewProfile(first);
    const quote = getUnderlyingEodQuote(first);
    const themes = getRowThemes(symbol, drs, profile);
    const assetCategory = getAssetCategory(drs);
    const intelligenceTags = getIntelligenceTags({
      themes,
      assetCategory,
      pe: first.pe,
      marketCapB: first.marketCapB,
      dividendYield: first.dividendYield
    });
    return {
      symbol,
      company: first.company,
      country: getTaxonomyCountry({
        underlying: symbol,
        region: first.region,
        assetType: first.assetType,
        underlyingCurrency: first.underlyingCurrency,
        corpus: corpusFor(symbol, drs, profile)
      }),
      sector: profile.industry,
      broadSector: profile.sector,
      theme: first.theme,
      themes,
      assetCategory,
      intelligenceTags,
      assetType: first.assetType,
      quote,
      pe: first.pe,
      marketCapB: first.marketCapB,
      dividendYield: first.dividendYield,
      turnoverM: drs.some((dr) => dr.turnoverM !== null) ? drs.reduce((sum, dr) => sum + (dr.turnoverM ?? 0), 0) : null,
      drs
    };
  }).sort((left, right) => (right.marketCapB ?? -Infinity) - (left.marketCapB ?? -Infinity));
}

function logoFallback(symbol: string) {
  return symbol.slice(0, 2).toUpperCase();
}

function countryBadgeClass(row: UnderlyingRow) {
  return `drNewTablePill drNewCountryPill drNewCountryPill-${countryLabel(row).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function normalizeCountryFilter(value: string | null | undefined): CountryFilter | null {
  return value && countryFilterValues.has(value as CountryFilter) ? value as CountryFilter : null;
}

function normalizeThemeFilter(value: string | null | undefined): ThemeFilter | null {
  return value && themeFilterValues.has(value as ThemeFilter) ? value as ThemeFilter : null;
}

function normalizeAssetTypeFilter(value: string | null | undefined): AssetTypeFilter | null {
  return value && assetTypeFilterValues.has(value as AssetTypeFilter) ? value as AssetTypeFilter : null;
}

function normalizeSortKey(value: string | null | undefined): SortKey {
  return value && sortKeyValues.has(value as SortKey) ? value as SortKey : "marketCap";
}

function screenerHref(next: Partial<{
  country: CountryFilter | null;
  theme: ThemeFilter | null;
  assetType: AssetTypeFilter | null;
  query: string | null;
  sort: SortKey | null;
}>, current: {
  country: CountryFilter | null;
  theme: ThemeFilter | null;
  assetType: AssetTypeFilter | null;
  query: string;
  sort: SortKey;
}) {
  const params = new URLSearchParams();
  const country = next.country !== undefined ? next.country : current.country;
  const theme = next.theme !== undefined ? next.theme : current.theme;
  const assetType = next.assetType !== undefined ? next.assetType : current.assetType;
  const query = next.query !== undefined ? next.query : current.query;
  const sort = (next.sort !== undefined ? next.sort : current.sort) ?? "marketCap";
  const cleanQuery = query?.trim() ?? "";

  if (country) params.set("country", country);
  if (theme) params.set("theme", theme);
  if (assetType) params.set("asset", assetType);
  if (cleanQuery) params.set("q", cleanQuery);
  if (sort !== "marketCap") params.set("sort", sort);

  const queryString = params.toString();
  return queryString ? `/dr-new?${queryString}` : "/dr-new";
}

function UnderlyingLogoImage({ symbol }: { symbol: string }) {
  const candidates = logoCandidates(symbol);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const currentLogo = candidates[candidateIndex] ?? null;

  if (!currentLogo) return <>{logoFallback(symbol)}</>;

  return (
    <img
      src={currentLogo}
      alt=""
      loading="lazy"
      onError={() => {
        setCandidateIndex((value) => {
          if (value >= candidates.length - 1) return value;
          return value + 1;
        });
      }}
    />
  );
}

export function ScreenerWorkspace({ rows, initialFilters = {} }: { rows: DrNewRow[]; initialFilters?: ScreenerInitialFilters }) {
  const [countryFilter, setCountryFilter] = useState<CountryFilter | null>(() => normalizeCountryFilter(initialFilters.country));
  const [themeFilter, setThemeFilter] = useState<ThemeFilter | null>(() => normalizeThemeFilter(initialFilters.theme));
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter | null>(() => normalizeAssetTypeFilter(initialFilters.assetType));
  const [sortKey, setSortKey] = useState<SortKey>(() => normalizeSortKey(initialFilters.sort));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialFilters.query?.trim() ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showMoreCountries, setShowMoreCountries] = useState(() => {
    const initialCountry = normalizeCountryFilter(initialFilters.country);
    return initialCountry ? preferredCountryOrder.indexOf(initialCountry) >= primaryCountryCount : false;
  });
  const [showMoreThemes, setShowMoreThemes] = useState(() => normalizeThemeFilter(initialFilters.theme) !== null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchShellRef = useRef<HTMLFormElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const underlyings = useMemo(() => buildUnderlyingRows(rows), [rows]);
  const countryCounts = useMemo(() => {
    const counts = new Map<CountryFilter, number>();
    underlyings.forEach((row) => counts.set(row.country, (counts.get(row.country) ?? 0) + 1));
    return counts;
  }, [underlyings]);
  const themeCounts = useMemo(() => {
    const counts = new Map<ThemeFilter, number>();
    underlyings.forEach((row) => row.themes.forEach((theme) => counts.set(theme, (counts.get(theme) ?? 0) + 1)));
    return counts;
  }, [underlyings]);
  const orderedThemeFilters = useMemo(() => {
    const fallbackRank = new Map(popularThemeFallbackOrder.map((theme, index) => [theme, index]));
    const primaryThemes = themeFilters
      .filter((theme) => theme.label !== "Other / Diversified")
      .map((theme, index) => ({ ...theme, index, count: themeCount(theme.label, themeCounts) }))
      .filter((theme) => theme.count > 0)
      .sort((left, right) => {
        const leftFallbackRank = fallbackRank.get(left.label) ?? Number.POSITIVE_INFINITY;
        const rightFallbackRank = fallbackRank.get(right.label) ?? Number.POSITIVE_INFINITY;
        if (leftFallbackRank !== rightFallbackRank) return leftFallbackRank - rightFallbackRank;
        return right.count - left.count || left.index - right.index;
      })
      .slice(0, 6);
    const groupedThemeLabels = new Set(themeGroupDefinitions.flatMap((group) => group.themes));
    const secondaryThemes = themeFilters
      .filter((theme) => !primaryThemes.some((primary) => primary.label === theme.label) && groupedThemeLabels.has(theme.label))
      .map((theme) => ({ ...theme, count: themeCount(theme.label, themeCounts) }));

    return {
      primaryThemes,
      secondaryThemes,
      secondaryActiveCount: secondaryThemes.reduce((sum, theme) => sum + theme.count, 0)
    };
  }, [themeCounts]);
  const orderedCountryFilters = useMemo(() => {
    const countryByValue = new Map(countryFilters.map((country) => [country.value, country]));
    return preferredCountryOrder
      .map((country) => countryByValue.get(country))
      .filter((country): country is typeof countryFilters[number] => Boolean(country));
  }, []);
  const primaryCountryFilters = orderedCountryFilters.slice(0, primaryCountryCount);
  const secondaryCountryFilters = orderedCountryFilters.slice(primaryCountryCount);
  const selectedCountryIsSecondary = countryFilter ? secondaryCountryFilters.some((country) => country.value === countryFilter) : false;
  const assetTypeCounts = useMemo(() => {
    const counts = new Map<AssetTypeFilter, number>();
    underlyings.forEach((row) => counts.set(row.assetCategory, (counts.get(row.assetCategory) ?? 0) + 1));
    return counts;
  }, [underlyings]);
  const trimmedSearchQuery = searchQuery.trim();
  const loweredSearchQuery = trimmedSearchQuery.toLowerCase();
  const filtered = underlyings.filter((row) => {
    if (!matchesCountryFilter(row, countryFilter)) return false;
    if (themeFilter && !row.themes.includes(themeFilter)) return false;
    if (assetTypeFilter && row.assetCategory !== assetTypeFilter) return false;
    if (!matchesSearchQuery(row, searchQuery)) return false;
    if (sortKey === "gainers" && !((row.quote?.changePct ?? 0) > 0)) return false;
    if (sortKey === "losers" && !((row.quote?.changePct ?? 0) < 0)) return false;
    return true;
  });
  const sorted = [...filtered].sort((left, right) => {
    if (sortKey === "gainers") return sortNumber(right.quote?.changePct ?? null) - sortNumber(left.quote?.changePct ?? null);
    if (sortKey === "losers") return sortNumber(left.quote?.changePct ?? null) - sortNumber(right.quote?.changePct ?? null);
    if (sortKey === "pe") return (left.pe ?? Infinity) - (right.pe ?? Infinity);
    if (sortKey === "drAvailable") return right.drs.length - left.drs.length;
    return (right.marketCapB ?? -Infinity) - (left.marketCapB ?? -Infinity);
  });
  const searchSuggestions = useMemo(() => {
    if (!loweredSearchQuery) return [];

    const directMatch = (value: string | null | undefined) => value?.toLowerCase().includes(loweredSearchQuery) ?? false;
    const suggestions: SearchSuggestion[] = [];

    underlyings
      .filter((row) => directMatch(row.symbol) || directMatch(row.company))
      .slice(0, 4)
      .forEach((row) => {
        suggestions.push({
          id: `underlying-${row.symbol}`,
          kind: "underlying",
          label: row.symbol,
          query: row.symbol,
          underlyingSymbol: row.symbol,
          meta: `${row.company} • ${row.themes.slice(0, 2).join(" • ")} • ${countryLabel(row)}`
        });
      });

    const seenDrTickers = new Set<string>();
    underlyings.forEach((row) => {
      row.drs.forEach((dr) => {
        if (seenDrTickers.has(dr.ticker)) return;
        if (!directMatch(dr.ticker) && !directMatch(dr.company) && !directMatch(dr.issuer)) return;
        seenDrTickers.add(dr.ticker);
        suggestions.push({
          id: `dr-${dr.ticker}`,
          kind: "dr",
          label: dr.ticker,
          query: dr.ticker,
          underlyingSymbol: row.symbol,
          meta: `Thai DR • ${dr.issuer}`
        });
      });
    });

    themeFilters
      .filter((theme) => theme.label.toLowerCase().includes(loweredSearchQuery))
      .forEach((theme) => {
        suggestions.push({
          id: `theme-${theme.label}`,
          kind: "theme",
          label: theme.label,
          query: theme.label,
          theme: theme.label,
          meta: "Theme"
        });
      });

    countryFilters
      .filter((country) => country.label.toLowerCase().includes(loweredSearchQuery))
      .forEach((country) => {
        suggestions.push({
          id: `country-${country.value}`,
          kind: "country",
          label: country.label,
          query: country.label,
          country: country.value,
          meta: "Country"
        });
      });

    assetTypeFilters
      .filter((assetType) => assetType.toLowerCase().includes(loweredSearchQuery))
      .forEach((assetType) => {
        suggestions.push({
          id: `asset-${assetType}`,
          kind: "assetType",
          label: assetType,
          query: assetType,
          assetType,
          meta: "Asset type"
        });
      });

    return suggestions.filter((suggestion, index, list) => list.findIndex((candidate) => candidate.id === suggestion.id) === index).slice(0, 8);
  }, [loweredSearchQuery, underlyings]);
  const idleSuggestions = useMemo(() => {
    const base = recentSearches.length > 0
      ? recentSearches.map((query) => ({
          id: `recent-${query}`,
          kind: "underlying" as const,
          label: query,
          query,
          meta: "Recent search"
        }))
      : [
          { id: "suggested-nvda", kind: "underlying" as const, label: "NVDA", query: "NVDA", meta: "Suggested search" },
          { id: "suggested-tesla", kind: "underlying" as const, label: "Tesla", query: "Tesla", meta: "Suggested search" },
          { id: "suggested-ai", kind: "theme" as const, label: "AI & Semiconductor", query: "AI & Semiconductor", meta: "Suggested search", theme: "AI & Semiconductor" as ThemeFilter },
          { id: "suggested-japan", kind: "country" as const, label: "Japan", query: "Japan", meta: "Suggested search", country: "Japan" as CountryFilter }
        ];

    return base.slice(0, 4);
  }, [recentSearches]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (searchShellRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
    }

    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleShortcut);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  function pushRecentSearch(query: string) {
    const value = query.trim();
    if (!value) return;
    setRecentSearches((current) => [value, ...current.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 4));
  }

  function applySuggestion(suggestion: SearchSuggestion) {
    setSearchQuery(suggestion.query);
    setSearchOpen(false);
    pushRecentSearch(suggestion.query);

    if (suggestion.theme) setThemeFilter(suggestion.theme);
    if (suggestion.country) setCountryFilter(suggestion.country);
    if (suggestion.assetType) setAssetTypeFilter(suggestion.assetType);
    if (suggestion.underlyingSymbol) setExpanded(suggestion.underlyingSymbol);
  }

  function submitSearch() {
    if (searchSuggestions.length > 0 && loweredSearchQuery) {
      applySuggestion(searchSuggestions[0]!);
      return;
    }

    pushRecentSearch(searchQuery);
    setSearchOpen(false);
  }

  function drListingsFor(row: UnderlyingRow): DrListingRow[] {
    const ranked = [...row.drs].sort((left, right) => sortNumber(right.turnoverM) - sortNumber(left.turnoverM));
    const maxTurnover = ranked[0]?.turnoverM ?? null;
    return ranked.map((dr, index) => ({
      ...dr,
      liquidityShare: maxTurnover && maxTurnover > 0 && dr.turnoverM !== null ? dr.turnoverM / maxTurnover : 0,
      isMostLiquid: index === 0 && (dr.turnoverM ?? 0) > 0
    }));
  }

  function pushScreenerUrl(href: string) {
    window.history.pushState(null, "", href);
  }

  const currentFilterState = {
    country: countryFilter,
    theme: themeFilter,
    assetType: assetTypeFilter,
    query: searchQuery,
    sort: sortKey
  };

  return (
    <section className="drNewWorkspace">
      <div className="drNewWorkspaceHead">
        <div>
          <p className="drNewKicker">Thai DR terminal</p>
          <h2>Institutional DR screener</h2>
        </div>
      </div>

      <div className="drNewQuickFilters" aria-label="Quick filters">
        <div className="drNewFilterRow">
          <span className="drNewChipLabel">Country</span>
          <div className="drNewChipGroup" role="list">
            <FilterChip
              active={countryFilter === null}
              label="All"
              onClick={() => {
                setCountryFilter(null);
                pushScreenerUrl(screenerHref({ country: null }, currentFilterState));
              }}
            />
            {primaryCountryFilters.map((filter) => {
              const count = countryCounts.get(filter.value) ?? 0;
              return (
                <FilterChip
                  key={filter.value}
                  active={countryFilter === filter.value}
                  count={count}
                  disabled={count === 0}
                  icon={filter.flag}
                  label={filter.label}
                  title={count === 0 ? "No mapped DRs in the current dataset" : `${count} mapped underlyings`}
                  onClick={() => {
                    const nextCountry = countryFilter === filter.value ? null : filter.value;
                    setCountryFilter(nextCountry);
                    pushScreenerUrl(screenerHref({ country: nextCountry }, currentFilterState));
                  }}
                />
              );
            })}
            {secondaryCountryFilters.length > 0 ? (
              <button
                type="button"
                className={`drNewFilterMoreToggle ${showMoreCountries || selectedCountryIsSecondary ? "active" : ""}`}
                onClick={() => setShowMoreCountries((value) => !value)}
              >
                More
                <small>{secondaryCountryFilters.reduce((sum, country) => sum + (countryCounts.get(country.value) ?? 0), 0)}</small>
              </button>
            ) : null}
            {showMoreCountries || selectedCountryIsSecondary ? (
              <span className="drNewFilterMoreInline">
                {secondaryCountryFilters.map((filter) => {
                  const count = countryCounts.get(filter.value) ?? 0;
                  return (
                    <FilterChip
                      key={filter.value}
                      active={countryFilter === filter.value}
                      count={count}
                      disabled={count === 0}
                      icon={filter.flag}
                      label={filter.label}
                      title={count === 0 ? "No mapped DRs in the current dataset" : `${count} mapped underlyings`}
                      onClick={() => {
                        const nextCountry = countryFilter === filter.value ? null : filter.value;
                        setCountryFilter(nextCountry);
                        pushScreenerUrl(screenerHref({ country: nextCountry }, currentFilterState));
                      }}
                    />
                  );
                })}
              </span>
            ) : null}
          </div>
        </div>
        <div className="drNewFilterRow">
          <span className="drNewChipLabel">Asset Type</span>
          <div className="drNewChipGroup" role="list">
            <FilterChip
              active={assetTypeFilter === null}
              label="All"
              onClick={() => {
                setAssetTypeFilter(null);
                pushScreenerUrl(screenerHref({ assetType: null }, currentFilterState));
              }}
            />
            {assetTypeFilters.map((label) => {
              const count = assetTypeCounts.get(label) ?? 0;
              return (
                <FilterChip
                  key={label}
                  active={assetTypeFilter === label}
                  count={count}
                  disabled={count === 0}
                  label={label}
                  title={count === 0 ? "No mapped DRs in the current dataset" : `${count} mapped underlyings`}
                  onClick={() => {
                    const nextAssetType = assetTypeFilter === label ? null : label;
                    setAssetTypeFilter(nextAssetType);
                    pushScreenerUrl(screenerHref({ assetType: nextAssetType }, currentFilterState));
                  }}
                />
              );
            })}
          </div>
        </div>
        <div className="drNewFilterRow drNewThemeFilterRow">
          <span className="drNewChipLabel">Theme</span>
          <div className="drNewChipGroup drNewThemeFilterGroup" role="list">
            <span className="drNewFilterSectionHint">Popular</span>
            <div className="drNewThemeFilterLine">
              {orderedThemeFilters.primaryThemes.map((theme) => {
                const count = themeCounts.get(theme.label) ?? 0;
                return (
                  <FilterChip
                    key={theme.label}
                    active={themeFilter === theme.label}
                    count={count}
                    disabled={count === 0}
                    icon={theme.icon}
                    label={theme.label}
                    title={count === 0 ? "No mapped DRs in the current dataset" : `${count} mapped underlyings`}
                    onClick={() => {
                      const nextTheme = themeFilter === theme.label ? null : theme.label;
                      setThemeFilter(nextTheme);
                      pushScreenerUrl(screenerHref({ theme: nextTheme }, currentFilterState));
                    }}
                  />
                );
              })}
              {orderedThemeFilters.secondaryThemes.length > 0 ? (
                <button
                  type="button"
                  className={`drNewThemeMoreToggle ${showMoreThemes ? "active" : ""}`}
                  onClick={() => setShowMoreThemes((value) => !value)}
                  title="Show smaller or lower-coverage theme groups"
                >
                  <span aria-hidden="true">🌐</span>
                  More themes
                  <small>{orderedThemeFilters.secondaryActiveCount}</small>
                </button>
              ) : null}
            </div>
            {showMoreThemes ? (
              <div className="drNewThemeGroupPanel">
                {themeGroupDefinitions.map((group) => (
                  <section key={group.title}>
                    <strong>{group.title}</strong>
                    <div className="drNewThemeFilterLine drNewThemeFilterLineSecondary">
                      {group.themes.map((themeLabel) => {
                        const theme = themeMeta(themeLabel);
                        const count = themeCounts.get(themeLabel) ?? 0;
                        return (
                          <FilterChip
                            key={themeLabel}
                            active={themeFilter === themeLabel}
                            count={count}
                            disabled={count === 0}
                            icon={theme.icon}
                            label={theme.label}
                            title={count === 0 ? "No mapped DRs in the current dataset" : `${count} mapped underlyings`}
                            onClick={() => {
                              const nextTheme = themeFilter === themeLabel ? null : themeLabel;
                              setThemeFilter(nextTheme);
                              pushScreenerUrl(screenerHref({ theme: nextTheme }, currentFilterState));
                            }}
                          />
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="drNewSortGroup">
          <span className="drNewEodNote">Underlying data as of latest overseas market close.</span>
          <form className="drNewUniversalSearch" ref={searchShellRef} action="/dr-new" method="get">
            {countryFilter ? <input type="hidden" name="country" value={countryFilter} /> : null}
            {themeFilter ? <input type="hidden" name="theme" value={themeFilter} /> : null}
            {assetTypeFilter ? <input type="hidden" name="asset" value={assetTypeFilter} /> : null}
            {sortKey !== "marketCap" ? <input type="hidden" name="sort" value={sortKey} /> : null}
            <label className="drNewUniversalSearchField">
              <span className="drNewUniversalSearchIcon" aria-hidden="true">⌕</span>
              <input
                ref={searchInputRef}
                name="q"
                type="text"
                value={searchQuery}
                placeholder="Search NVDA, Tesla, AI..."
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitSearch();
                  }
                }}
              />
              <kbd>⌘K</kbd>
            </label>
            {searchOpen ? (
              <div className="drNewUniversalSearchMenu" role="listbox" aria-label="Universal search suggestions">
                <div className="drNewUniversalSearchMenuHead">
                  <span>{trimmedSearchQuery ? "Suggestions" : recentSearches.length > 0 ? "Recent searches" : "Suggested searches"}</span>
                  {trimmedSearchQuery ? <span>{searchSuggestions.length} found</span> : null}
                </div>
                {(trimmedSearchQuery ? searchSuggestions : idleSuggestions).length > 0 ? (
                  <div className="drNewUniversalSearchMenuBody">
                    {(trimmedSearchQuery ? searchSuggestions : idleSuggestions).map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion.id}
                        className="drNewUniversalSearchItem"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applySuggestion(suggestion)}
                      >
                        <span className="drNewUniversalSearchItemLabel">{suggestion.label}</span>
                        <span className="drNewUniversalSearchItemMeta">{suggestion.meta}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="drNewUniversalSearchEmpty">
                    <strong>No matches yet</strong>
                    <span>Try NVDA, Tesla, AI, Japan, or a Thai DR ticker.</span>
                  </div>
                )}
              </div>
            ) : null}
          </form>
          <div className="drNewControlActions">
            <div className="drNewRankControl" aria-label="View and ranking mode">
              <span>View / Rank by</span>
              <div className="drNewRankModes" role="group" aria-label="Rank DR underlyings">
                {sortOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={sortKey === option.value ? "active" : ""}
                    onClick={() => {
                      setSortKey(option.value);
                      pushScreenerUrl(screenerHref({ sort: option.value }, { ...currentFilterState, sort: option.value }));
                    }}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.helper}</small>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="drNewIconButton" aria-label="Customize screener" title="Customize">⚙</button>
          </div>
        </div>
      </div>

      <div className="drNewTableFrame">
        <table className="drNewTable drNewUnderlyingTable simple">
          <thead>
            <tr>
              <th>Underlying</th>
              <th>Company</th>
              <th>Country</th>
              <th>Theme</th>
              <th>Underlying Price</th>
              <th className="drNewMoveColumn">1D %</th>
              <th>1W %</th>
              <th>1M %</th>
              <th>Market Cap</th>
              <th>P/E</th>
              <th>DR Listings</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td className="drNewEmpty" colSpan={11}>
                  No underlying matched this view.
                </td>
              </tr>
            ) : null}
            {sorted.map((row) => {
              const drListings = drListingsFor(row);
              return (
                <Fragment key={row.symbol}>
                <tr>
                  <td>
                    <button
                      type="button"
                      className="drNewTickerStack drNewTickerButton"
                      onClick={() => setExpanded((value) => value === row.symbol ? null : row.symbol)}
                    >
                      <span className="drNewLogoMark" aria-hidden="true">
                        <UnderlyingLogoImage symbol={row.symbol} />
                      </span>
                      <span>
                        <strong>{row.symbol}</strong>
                        <small className="drNewTickerMeta">
                          {countryLabel(row)} {row.assetCategory} · {row.drs.length} {row.drs.length === 1 ? "DR" : "DRs"}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td className="drNewCompanyCell drNameClamp" title={row.company}>{row.company}</td>
                  <td>
                    <span className={countryBadgeClass(row)}>
                      {countryMeta(row).flag ? <span aria-hidden="true">{countryMeta(row).flag}</span> : null}
                      {countryLabel(row)}
                    </span>
                  </td>
                  <td>
                    <div className="drNewTagStack">
                      <span className="drNewThemeChips">
                        {row.themes.slice(0, 4).map((theme) => (
                          <span key={theme}>
                            {themeMeta(theme).icon ? <span className="drNewThemeIcon" aria-hidden="true">{themeMeta(theme).icon}</span> : null}
                            {theme}
                          </span>
                        ))}
                        {row.themes.length > 4 ? <span className="muted">+{row.themes.length - 4}</span> : null}
                      </span>
                      <span className="drNewTagMeta">
                        <span>{row.sector}</span>
                        {row.intelligenceTags.slice(0, 2).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </span>
                    </div>
                  </td>
                  <td className="numeric">{formatUnderlyingPrice(row.quote)}</td>
                  <td className={(row.quote?.changePct ?? 0) < 0 ? "numeric negative drNewMoveCell" : "numeric positive drNewMoveCell"}>{formatPct(row.quote?.changePct ?? null)}</td>
                  <td className={(row.quote?.oneWeekReturnPct ?? 0) < 0 ? "numeric negative drNewTrendCell" : "numeric positive drNewTrendCell"}>{formatPct(row.quote?.oneWeekReturnPct ?? null)}</td>
                  <td className={(row.quote?.oneMonthReturnPct ?? 0) < 0 ? "numeric negative drNewTrendCell" : "numeric positive drNewTrendCell"}>{formatPct(row.quote?.oneMonthReturnPct ?? null)}</td>
                  <td className="numeric drNewMarketCapCell">{formatMarketCap(row.marketCapB)}</td>
                  <td className="numeric">{row.pe === null ? "—" : row.pe.toFixed(1)}</td>
                  <td className="numeric drNewListingsCell">{row.drs.length} {row.drs.length === 1 ? "DR" : "DRs"}</td>
                </tr>
                {expanded === row.symbol ? (
                  <tr className="drNewExpandedRow" key={`${row.symbol}-expanded`}>
                    <td colSpan={11}>
                      <div className="drNewDrOptions simple">
                        <div className="drNewDrOptionsHead">
                          <strong>DR listings for {row.symbol}</strong>
                        </div>
                        <div className="drNewDrOptionGrid simple header">
                          <span>DR</span>
                          <span>Issuer</span>
                          <span>Price</span>
                          <span>1D %</span>
                          <span>Trading Value</span>
                          <span>Ratio</span>
                        </div>
                        {drListings.map((dr) => (
                          <a className="drNewDrOptionGrid simple drNewDrOptionLink" href={`/dr-new/${dr.ticker}`} key={dr.ticker}>
                            <span className="drNewDrTickerCell">
                              <strong>{dr.ticker}</strong>
                              {dr.isMostLiquid ? <em className="drNewDrBadge">Most Liquid</em> : null}
                            </span>
                            <span>{dr.issuer}</span>
                            <span className="numeric">{formatDrPrice(dr.price)}</span>
                            <span className={(dr.changePct ?? 0) < 0 ? "numeric negative" : "numeric positive"}>{formatPct(dr.changePct)}</span>
                            <span className="drNewLiquidityCell">
                              <span className="numeric">{formatDrTradingValue(dr.turnoverM)}</span>
                              <span className="drNewLiquidityBar" aria-hidden="true">
                                <span style={{ width: `${Math.max(10, dr.liquidityShare * 100)}%` }} />
                              </span>
                            </span>
                            <span className="drNewRatioMeta">
                              <span>Ratio</span>
                              <strong>{ratioCompactText(dr.ratio)}</strong>
                            </span>
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
