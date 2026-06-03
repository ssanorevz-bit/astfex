"use client";

import { Fragment, useDeferredValue, useState } from "react";
import { getDrNewProfile } from "../dr-new-derived";
import type { DrNewRow } from "../mock-dr-new-data";
import { formatUnderlyingPrice, getUnderlyingEodQuote, type UnderlyingEodQuote } from "../underlying-eod-quotes";

type UnderlyingRow = {
  symbol: string;
  company: string;
  country: string;
  sector: string;
  broadSector: string;
  theme: string;
  assetType: DrNewRow["assetType"];
  quote: UnderlyingEodQuote | null;
  pe: number | null;
  marketCapB: number | null;
  dividendYield: number | null;
  turnoverM: number | null;
  drs: DrNewRow[];
};

type CountryFilter = "US" | "China" | "Hong Kong" | "Japan" | "Vietnam";
type ThemeFilter =
  | "AI"
  | "Semiconductor"
  | "Technology"
  | "EV"
  | "China Tech"
  | "Healthcare"
  | "Finance"
  | "Consumer"
  | "Luxury"
  | "Gaming / Entertainment"
  | "Travel"
  | "Energy / Uranium"
  | "Commodity"
  | "Bond"
  | "Index ETF";
type SortKey = "marketCap" | "change1d" | "ytdReturn" | "oneYearReturn" | "pe" | "drAvailable" | "mostPopular" | "nameAz";

const countryFilters: Array<{ label: string; value: CountryFilter }> = [
  { label: "US", value: "US" },
  { label: "Hong Kong", value: "Hong Kong" },
  { label: "China", value: "China" },
  { label: "Japan", value: "Japan" },
  { label: "Vietnam", value: "Vietnam" }
];

const themeFilters: Array<{ label: ThemeFilter; symbols: string[] }> = [
  { label: "AI", symbols: ["NVDA", "PLTR", "IONQ", "RGTI", "KGI Taiwan AI 50 ETF"] },
  { label: "Semiconductor", symbols: ["AMD", "ASML", "AVGO", "MU", "MRVL", "LRCX", "CNSEMI ETF", "JPSEMI ETF"] },
  { label: "Technology", symbols: ["AAPL", "MSFT", "GOOG", "META", "ORCL", "CRM", "NOW", "SNOW", "FPT"] },
  { label: "EV", symbols: ["TSLA", "BYD", "XPENG", "CNEV ETF"] },
  { label: "China Tech", symbols: ["BABA", "TENCENT", "TCEHY", "JD", "MEITUAN", "BIDU", "KUAISH", "HSTECH ETF", "XIAOMI"] },
  { label: "Healthcare", symbols: ["LLY", "JNJ", "PFE", "UNH", "ABBV", "CNBIO ETF"] },
  { label: "Finance", symbols: ["JPM", "BAC", "MS", "BLK", "AXP", "VISA", "MA", "VCB"] },
  { label: "Consumer", symbols: ["KO", "PEP", "SBUX", "NIKE", "COST", "WMT", "VNM"] },
  { label: "Luxury", symbols: ["LVMH", "HERMES", "FERRARI"] },
  { label: "Gaming / Entertainment", symbols: ["NFLX", "DISNEY", "SPOT", "RBLX", "NINTENDO"] },
  { label: "Travel", symbols: ["ABNB", "BKNG", "EXPE", "TRIPCOM"] },
  { label: "Energy / Uranium", symbols: ["CCJ", "CEG", "NEE", "S&P Crude Oil ETF"] },
  { label: "Commodity", symbols: ["Gold ETF", "Silver ETF", "REMX ETF"] },
  { label: "Bond", symbols: ["SPBOND ETF", "BONDAS ETF"] },
  { label: "Index ETF", symbols: ["S&P500", "NASDAQ100", "CSI300", "Nikkei", "Vietnam ETF", "VN30 ETF", "VN30"] }
];

const primaryThemeFilters: ThemeFilter[] = [
  "AI",
  "Semiconductor",
  "Technology",
  "EV",
  "China Tech",
  "Healthcare",
  "Finance"
];

const moreThemeFilters: ThemeFilter[] = [
  "Consumer",
  "Commodity",
  "Index ETF",
  "Luxury",
  "Gaming / Entertainment",
  "Travel",
  "Energy / Uranium",
  "Bond"
];

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 2000 ? 1 : 2)}T`;
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

function sortNumber(value: number | null) {
  return value ?? Number.NEGATIVE_INFINITY;
}

function conversionRatioText(ratio: string, underlying: string) {
  const [, denominator] = ratio.split(":").map((part) => Number(part));
  if (!Number.isFinite(denominator) || denominator <= 0) return ratio;
  return `${denominator.toLocaleString("en-US")} DR = 1 ${underlying}`;
}

function matchesThemeFilter(row: UnderlyingRow, filter: ThemeFilter) {
  const theme = themeFilters.find((item) => item.label === filter);
  if (!theme) return true;
  const corpus = [
    row.symbol,
    row.company,
    row.sector,
    row.broadSector,
    row.theme,
    ...row.drs.flatMap((dr) => [dr.ticker, dr.underlying, dr.company, dr.theme])
  ].join(" ").toUpperCase();
  return theme.symbols.some((symbol) => corpus.includes(symbol.toUpperCase()));
}

function buildUnderlyingRows(rows: DrNewRow[]) {
  const groups = new Map<string, DrNewRow[]>();
  rows.forEach((row) => {
    groups.set(row.underlying, [...(groups.get(row.underlying) ?? []), row]);
  });

  return Array.from(groups.entries()).map(([symbol, drs]): UnderlyingRow => {
    const first = drs[0];
    const profile = getDrNewProfile(first);
    const quote = getUnderlyingEodQuote(first);
    return {
      symbol,
      company: first.company,
      country: first.region,
      sector: profile.industry,
      broadSector: profile.sector,
      theme: first.theme,
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

export function ScreenerWorkspace({ rows }: { rows: DrNewRow[] }) {
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<CountryFilter | null>(null);
  const [themeFilter, setThemeFilter] = useState<ThemeFilter | null>(null);
  const [showMoreThemes, setShowMoreThemes] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [expanded, setExpanded] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const underlyings = buildUnderlyingRows(rows);
  const filtered = underlyings.filter((row) => {
    const matchesQuery = !deferredQuery || [row.symbol, row.company, row.country, row.sector, row.theme, ...row.drs.map((dr) => dr.ticker)]
      .some((value) => value.toLowerCase().includes(deferredQuery));
    if (!matchesQuery) return false;
    if (countryFilter === "US" && row.country !== "US") return false;
    if (countryFilter === "China" && row.country !== "China") return false;
    if (countryFilter === "Hong Kong" && row.country !== "Hong Kong") return false;
    if (countryFilter === "Japan" && row.country !== "Japan") return false;
    if (countryFilter === "Vietnam" && row.country !== "Vietnam") return false;
    if (themeFilter && !matchesThemeFilter(row, themeFilter)) return false;
    return true;
  });
  const sorted = [...filtered].sort((left, right) => {
    if (sortKey === "change1d") return sortNumber(right.quote?.changePct ?? null) - sortNumber(left.quote?.changePct ?? null);
    if (sortKey === "ytdReturn") return sortNumber(right.quote?.ytdReturnPct ?? null) - sortNumber(left.quote?.ytdReturnPct ?? null);
    if (sortKey === "oneYearReturn") return sortNumber(right.quote?.oneYearReturnPct ?? null) - sortNumber(left.quote?.oneYearReturnPct ?? null);
    if (sortKey === "pe") return (left.pe ?? Infinity) - (right.pe ?? Infinity);
    if (sortKey === "drAvailable") return right.drs.length - left.drs.length;
    if (sortKey === "mostPopular") return sortNumber(right.turnoverM) - sortNumber(left.turnoverM);
    if (sortKey === "nameAz") return left.symbol.localeCompare(right.symbol);
    return (right.marketCapB ?? -Infinity) - (left.marketCapB ?? -Infinity);
  });

  return (
    <section className="drNewWorkspace">
      <div className="drNewWorkspaceHead">
        <div>
          <p className="drNewKicker">Underlying screener</p>
          <h2>Parent stocks with Thai DR availability</h2>
        </div>
        <label className="drNewSimpleSearch">
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="NVDA, Nvidia, NVDA80" />
        </label>
      </div>

      <div className="drNewQuickFilters" aria-label="Quick filters">
        <div className="drNewChipGroup">
          <span className="drNewChipLabel">Country</span>
          <button
            type="button"
            className={countryFilter === null ? "active" : ""}
            onClick={() => setCountryFilter(null)}
          >
            All
          </button>
          {countryFilters.map((filter) => (
            <button
              type="button"
              key={filter.value}
              className={countryFilter === filter.value ? "active" : ""}
              onClick={() => setCountryFilter((value) => value === filter.value ? null : filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="drNewChipGroup">
          <span className="drNewChipLabel">Theme</span>
          {primaryThemeFilters.map((label) => (
            <button
              type="button"
              key={label}
              className={themeFilter === label ? "active" : ""}
              onClick={() => setThemeFilter((value) => value === label ? null : label)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={showMoreThemes || (themeFilter !== null && moreThemeFilters.includes(themeFilter)) ? "active" : ""}
            onClick={() => setShowMoreThemes((value) => !value)}
          >
            More
          </button>
        </div>
        {showMoreThemes ? (
          <div className="drNewChipGroup secondary">
            {moreThemeFilters.map((label) => (
              <button
                type="button"
                key={label}
                className={themeFilter === label ? "active" : ""}
                onClick={() => setThemeFilter((value) => value === label ? null : label)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="drNewSortGroup">
          <span className="drNewEodNote">Underlying data as of latest market close</span>
          <label>
            <span>Sort by</span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="marketCap">Market Cap</option>
              <option value="change1d">1D Return</option>
              <option value="ytdReturn">YTD Return</option>
              <option value="oneYearReturn">1Y Return</option>
              <option value="pe">PE Ratio</option>
              <option value="drAvailable">Thai DRs Available</option>
              <option value="mostPopular">Most Popular</option>
              <option value="nameAz">Name A-Z</option>
            </select>
          </label>
          <button type="button">Watchlist</button>
          <button type="button">Customize</button>
        </div>
      </div>

      <div className="drNewTableFrame">
        <table className="drNewTable drNewUnderlyingTable simple">
          <thead>
            <tr>
              <th>Underlying</th>
              <th>Company</th>
              <th>Country</th>
              <th>Theme/Sector</th>
              <th>Price</th>
              <th>1D %</th>
              <th>PE</th>
              <th>Market Cap</th>
              <th>Thai DRs</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td className="drNewEmpty" colSpan={9}>
                  No underlying matched this view.
                </td>
              </tr>
            ) : null}
            {sorted.map((row) => (
              <Fragment key={row.symbol}>
                <tr>
                  <td>
                    <button
                      type="button"
                      className="drNewTextAction"
                      onClick={() => setExpanded((value) => value === row.symbol ? null : row.symbol)}
                    >
                      {row.symbol}
                    </button>
                  </td>
                  <td className="drNewCompanyCell drNameClamp" title={row.company}>{row.company}</td>
                  <td><span className="drNewTablePill">{row.country}</span></td>
                  <td><span className="drNewSectorText">{row.sector}</span></td>
                  <td className="numeric">{formatUnderlyingPrice(row.quote)}</td>
                  <td className={(row.quote?.changePct ?? 0) < 0 ? "numeric negative" : "numeric positive"}>{formatPct(row.quote?.changePct ?? null)}</td>
                  <td className="numeric">{row.pe === null ? "—" : row.pe.toFixed(1)}</td>
                  <td className="numeric">{formatMarketCap(row.marketCapB)}</td>
                  <td>
                    <button
                      type="button"
                      className="drNewInlineAction"
                      onClick={() => setExpanded((value) => value === row.symbol ? null : row.symbol)}
                    >
                      {row.drs.length} Thai DRs
                    </button>
                  </td>
                </tr>
                {expanded === row.symbol ? (
                  <tr className="drNewExpandedRow">
                    <td colSpan={9}>
                      <div className="drNewDrOptions simple">
                        <div className="drNewDrOptionsHead">
                          <strong>Thai DRs for {row.symbol}</strong>
                        </div>
                        <div className="drNewDrOptionGrid simple header">
                          <span>DR</span>
                          <span>Issuer</span>
                          <span>Price</span>
                          <span>1D %</span>
                          <span>Trading Value</span>
                          <span>Ratio</span>
                          <span>Action</span>
                        </div>
                        {row.drs.length === 0 ? (
                          <div className="drNewDrOptionEmpty">No Thai DRs available for this underlying.</div>
                        ) : (
                          row.drs.map((dr) => (
                            <div className="drNewDrOptionGrid simple" key={dr.ticker}>
                              <strong>{dr.ticker}</strong>
                              <span>{dr.issuer}</span>
                              <span className="numeric">{formatDrPrice(dr.price)}</span>
                              <span className={(dr.changePct ?? 0) < 0 ? "numeric negative" : "numeric positive"}>{formatPct(dr.changePct)}</span>
                              <span className="numeric">{formatDrTradingValue(dr.turnoverM)}</span>
                              <span>{conversionRatioText(dr.ratio, row.symbol)}</span>
                              <a href={`/dr-new/${dr.ticker}`}>View</a>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
