"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { drThemeFilters, getTaxonomyAssetType, getTaxonomyCountry, getTaxonomyPrimaryTheme, getTaxonomyThemes, type DrThemeFilter } from "../dr-taxonomy";
import type { DrNewRow } from "../mock-dr-new-data";
import { getUnderlyingEodQuote } from "../underlying-eod-quotes";
import { UnderlyingLogoMark } from "./underlying-logo-mark";

type CompareMode = "same" | "theme";

type ScoredRow = {
  row: DrNewRow;
  liquidity: number;
  cost: number;
  yield: number;
  overall: number;
  badges: string[];
};

type MetricDefinition = {
  label: string;
  render: (row: DrNewRow) => string;
  tone?: "positive" | "negative" | "muted";
  cellClassName?: (row: DrNewRow) => string;
};

const themeOptions = drThemeFilters.map((theme) => theme.label);
const suggestedUnderlyings = ["MSFT", "NVDA", "AAPL", "BABA", "AMD", "AVGO", "AMZN"];

const modeCopy: Record<CompareMode, { title: string; description: string; searchLabel: string; placeholder: string }> = {
  same: {
    title: "Compare DRs",
    description: "เปรียบเทียบ DR ที่อ้างอิงหุ้นแม่เดียวกัน เพื่อเลือกตัวที่เหมาะที่สุด",
    searchLabel: "Search parent stock or DR",
    placeholder: "MSFT, NVDA, AAPL, BABA"
  },
  theme: {
    title: "Theme / Peer Compare",
    description: "ใช้เทียบ DR ในธีมหรือกลุ่มเดียวกัน เช่น AI & Semiconductor, Cloud & Software, China Tech",
    searchLabel: "Search theme or DR",
    placeholder: "AI & Semiconductor, China Tech, NVDA80"
  }
};

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPriceValue(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPrice(row: DrNewRow) {
  return formatPriceValue(row.price);
}

function formatTradingValue(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}B`;
  if (value >= 1) return `${value.toFixed(2)}M`;
  return `${(value * 1000).toFixed(0)}K`;
}

function formatVolume(value: number | null) {
  if (value === null) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString("en-US");
}

function formatMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 2000 ? 1 : 2)}T`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}B`;
}

function formatPe(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)}x`;
}

function formatPb(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(1)}x`;
}

function formatYield(value: number | null) {
  if (value === null) return "—";
  return `${value.toFixed(2)}%`;
}

function formatRatio(row: DrNewRow) {
  const parts = row.ratio.split(":");
  if (parts.length !== 2) return row.ratio;
  const underlyingUnits = Number(parts[0].replace(/,/g, ""));
  const drUnits = Number(parts[1].replace(/,/g, ""));
  if (!Number.isFinite(underlyingUnits) || !Number.isFinite(drUnits)) return row.ratio;
  return `${drUnits.toLocaleString("en-US")} DR = ${underlyingUnits.toLocaleString("en-US")} ${row.underlying}`;
}

function marketFromRow(row: DrNewRow) {
  if (getTaxonomyAssetType(row) !== "Stock") return "ETF / Product";
  return getTaxonomyCountry(row);
}

function rowMatches(row: DrNewRow, query: string) {
  const haystack = `${row.ticker} ${row.underlying} ${row.company} ${row.issuer} ${row.theme} ${row.region} ${getTaxonomyCountry(row)} ${getTaxonomyThemes(row).join(" ")}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function themeMatches(row: DrNewRow, theme: string) {
  return getTaxonomyThemes(row).includes(theme as DrThemeFilter);
}

function themeFromRow(row: DrNewRow) {
  return getTaxonomyPrimaryTheme(row);
}

function getUnderlyingChoices(rows: DrNewRow[]) {
  const rowsByUnderlying = new Map<string, DrNewRow[]>();
  rows.forEach((row) => {
    rowsByUnderlying.set(row.underlying, [...(rowsByUnderlying.get(row.underlying) ?? []), row]);
  });

  return [...rowsByUnderlying.entries()]
    .map(([underlying, items]) => ({
      underlying,
      rows: [...items].sort((left, right) => (right.turnoverM ?? -1) - (left.turnoverM ?? -1)),
      lead: [...items].sort((left, right) => (right.turnoverM ?? -1) - (left.turnoverM ?? -1))[0]
    }))
    .sort((left, right) => {
      if (right.rows.length !== left.rows.length) return right.rows.length - left.rows.length;
      return left.underlying.localeCompare(right.underlying);
    });
}

function scoreFromRange(rows: DrNewRow[], accessor: (row: DrNewRow) => number | null, reverse = false) {
  const values = rows
    .map(accessor)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (!values.length) {
    return () => 0;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (row: DrNewRow) => {
    const value = accessor(row);
    if (value === null || !Number.isFinite(value)) return 0;
    if (max === min) return 100;
    const normalized = (value - min) / (max - min);
    const ratio = reverse ? 1 - normalized : normalized;
    return Math.round(ratio * 100);
  };
}

function buildScores(rows: DrNewRow[]): ScoredRow[] {
  const liquidityScore = scoreFromRange(rows, (row) => row.turnoverM);
  const costScore = scoreFromRange(rows, (row) => row.price, true);
  const yieldScore = scoreFromRange(rows, (row) => row.dividendYield);

  const scored = rows.map((row) => {
    const liquidity = liquidityScore(row);
    const cost = costScore(row);
    const yieldValue = yieldScore(row);
    const overall = Math.round(liquidity * 0.5 + cost * 0.3 + yieldValue * 0.2);
    return {
      row,
      liquidity,
      cost,
      yield: yieldValue,
      overall,
      badges: [] as string[]
    };
  });

  const bestOverall = [...scored].sort((left, right) => right.overall - left.overall || left.row.ticker.localeCompare(right.row.ticker))[0];
  const bestLiquidity = [...scored].sort((left, right) => right.liquidity - left.liquidity || left.row.ticker.localeCompare(right.row.ticker))[0];
  const lowestCost = [...scored].sort((left, right) => right.cost - left.cost || left.row.ticker.localeCompare(right.row.ticker))[0];
  const highestYield = [...scored].sort((left, right) => right.yield - left.yield || left.row.ticker.localeCompare(right.row.ticker))[0];

  for (const item of scored) {
    if (bestOverall && item.row.ticker === bestOverall.row.ticker) item.badges.push("Best Overall");
    if (bestLiquidity && item.row.ticker === bestLiquidity.row.ticker) item.badges.push("Best Liquidity");
    if (lowestCost && item.row.ticker === lowestCost.row.ticker) item.badges.push("Lowest Cost");
    if (highestYield && item.row.ticker === highestYield.row.ticker && item.yield > 0) item.badges.push("Highest Yield");
    if (item.liquidity < 35) item.badges.push("Low Liquidity");
  }

  return scored.sort((left, right) => right.overall - left.overall || right.liquidity - left.liquidity || left.row.ticker.localeCompare(right.row.ticker));
}

function summaryCardNote(type: "liquidity" | "cost" | "yield" | "overall", row: DrNewRow) {
  if (type === "liquidity") return `${formatTradingValue(row.turnoverM)} trading value`;
  if (type === "cost") return `Unit price ${formatPrice(row)} THB`;
  if (type === "yield") return `${formatYield(row.dividendYield)} dividend yield`;
  return "Liquidity, unit cost, and yield balanced";
}

function quickReadLines(scoredRows: ScoredRow[]) {
  const bestOverall = scoredRows[0];
  const bestLiquidity = [...scoredRows].sort((left, right) => right.liquidity - left.liquidity)[0];
  const lowestCost = [...scoredRows].sort((left, right) => right.cost - left.cost)[0];
  const highestYield = [...scoredRows].sort((left, right) => right.yield - left.yield)[0];
  if (!bestOverall || !bestLiquidity || !lowestCost) {
    return ["No comparison signal yet for this underlying."];
  }

  const lines = [
    `${bestLiquidity.row.ticker} เหมาะกับคนที่เน้นสภาพคล่อง เพราะมี trading value สูงสุดในกลุ่ม`,
    `${lowestCost.row.ticker} เหมาะกับคนที่เน้นต้นทุนต่อหน่วยต่ำกว่าในกลุ่มนี้`,
    `${bestOverall.row.ticker} เป็นตัวเลือกที่บาลานซ์ที่สุดตอนนี้ จาก liquidity, unit cost, และ dividend yield`
  ];

  if (highestYield && highestYield.yield > 0 && highestYield.row.ticker !== bestOverall.row.ticker) {
    lines.push(`${highestYield.row.ticker} เด่นด้าน dividend yield มากกว่า แต่ควรดู liquidity ควบคู่กัน`);
  }

  return lines;
}

function buildMatrixColumns(count: number) {
  return {
    gridTemplateColumns: `156px repeat(${count}, minmax(110px, 1fr))`,
  } as const;
}

function CompareMetricSection({
  title,
  note,
  rows,
  metrics,
}: {
  title: string;
  note: string;
  rows: DrNewRow[];
  metrics: MetricDefinition[];
}) {
  const gridStyle = buildMatrixColumns(rows.length);
  return (
    <section className="drCompareSection">
      <div className="drCompareSectionHead">
        <div>
          <strong>{title}</strong>
          <p>{note}</p>
        </div>
      </div>
      <div className="drCompareMatrix">
        <div className="drCompareMatrixRow header" style={gridStyle}>
          <span>Metric</span>
          {rows.map((row) => <span key={`head-${title}-${row.ticker}`}>{row.ticker}</span>)}
        </div>
        {metrics.map((metric) => (
          <div className="drCompareMatrixRow" key={`${title}-${metric.label}`} style={gridStyle}>
            <strong>{metric.label}</strong>
            {rows.map((row) => (
              <span className={metric.cellClassName?.(row) ?? metric.tone ?? ""} key={`${metric.label}-${row.ticker}`}>
                {metric.render(row)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function CompareScoreTable({ scoredRows }: { scoredRows: ScoredRow[] }) {
  return (
    <section className="drCompareSection">
      <div className="drCompareSectionHead">
        <div>
          <strong>Scoreboard</strong>
          <p>Overall score balances liquidity, unit cost, and dividend yield.</p>
        </div>
      </div>
      <div className="drCompareScoreTable">
        <div className="header">
          <span>DR</span>
          <span>Liquidity</span>
          <span>Cost</span>
          <span>Yield</span>
          <span>Overall</span>
          <span>Badges</span>
        </div>
        {scoredRows.map((item) => (
          <div key={`score-${item.row.ticker}`}>
            <strong>{item.row.ticker}</strong>
            <span>{item.liquidity}</span>
            <span>{item.cost}</span>
            <span>{item.yield}</span>
            <span className="drCompareOverallScore">{item.overall}</span>
            <span className="drCompareBadgeRow">
              {item.badges.length ? item.badges.map((badge) => <i key={`${item.row.ticker}-${badge}`}>{badge}</i>) : <em>No signal</em>}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CompareWorkspace({
  rows,
  initialRequest,
}: {
  rows: DrNewRow[];
  initialRequest?: string | null;
}) {
  const [mode, setMode] = useState<CompareMode>("same");
  const [query, setQuery] = useState("");
  const [selectedUnderlying, setSelectedUnderlying] = useState("MSFT");
  const [selectedTheme, setSelectedTheme] = useState<DrThemeFilter>("AI & Semiconductor");

  const underlyingChoices = useMemo(() => getUnderlyingChoices(rows), [rows]);

  useEffect(() => {
    const requested = initialRequest;
    if (!requested) return;
    const normalized = requested.toUpperCase();
    const exactUnderlying = underlyingChoices.find((choice) => choice.underlying.toUpperCase() === normalized);
    if (exactUnderlying) {
      setSelectedUnderlying(exactUnderlying.underlying);
      return;
    }
    const matchedRow = rows.find((row) => row.ticker.toUpperCase() === normalized);
    if (matchedRow) setSelectedUnderlying(matchedRow.underlying);
  }, [rows, initialRequest, underlyingChoices]);

  const filteredChoices = underlyingChoices.filter((choice) => {
    if (!query.trim()) return true;
    return choice.rows.some((row) => rowMatches(row, query));
  });

  const visibleChoices = (query.trim() ? filteredChoices : filteredChoices.filter((choice) => suggestedUnderlyings.includes(choice.underlying)))
    .slice(0, 12);

  const selectedRows = useMemo(
    () => rows
      .filter((row) => row.underlying === selectedUnderlying)
      .sort((left, right) => (right.turnoverM ?? -1) - (left.turnoverM ?? -1) || left.ticker.localeCompare(right.ticker)),
    [rows, selectedUnderlying]
  );
  const selectedLead = selectedRows[0] ?? rows[0];
  const quote = getUnderlyingEodQuote(selectedLead);
  const selectedThemeForLead = themeFromRow(selectedLead);
  const sameUnderlyingCanCompare = selectedRows.length > 1;

  const scoredRows = useMemo(() => buildScores(selectedRows), [selectedRows]);
  const bestOverall = scoredRows[0];
  const bestLiquidity = [...scoredRows].sort((left, right) => right.liquidity - left.liquidity)[0];
  const lowestCost = [...scoredRows].sort((left, right) => right.cost - left.cost)[0];
  const highestYield = [...scoredRows].sort((left, right) => right.yield - left.yield)[0];

  const sameMetricsTop: MetricDefinition[] = [
    { label: "Price", render: (row) => formatPrice(row) },
    {
      label: "1D %",
      render: (row) => formatPct(row.changePct),
      cellClassName: (row) => ((row.changePct ?? 0) >= 0 ? "positive" : "negative"),
    },
    { label: "Volume", render: (row) => formatVolume(row.volume) },
    { label: "Trading Value", render: (row) => formatTradingValue(row.turnoverM) },
  ];

  const sameMetricsMiddle: MetricDefinition[] = [
    { label: "Dividend Yield", render: (row) => formatYield(row.dividendYield) },
    { label: "PE", render: (row) => formatPe(row.pe) },
    { label: "PB", render: (row) => formatPb(row.pb) },
    { label: "Market Cap", render: (row) => formatMarketCap(row.marketCapB) },
  ];

  const sameMetricsBottom: MetricDefinition[] = [
    { label: "Issuer", render: (row) => row.issuer },
    { label: "Ratio", render: (row) => formatRatio(row) },
    { label: "First Trade", render: (row) => row.firstTradeDate ?? "—" },
    { label: "Status", render: (row) => row.alert },
  ];

  const themeRows = rows
    .filter((row) => themeMatches(row, selectedTheme))
    .filter((row) => rowMatches(row, query))
    .sort((left, right) => (right.turnoverM ?? -1) - (left.turnoverM ?? -1))
    .slice(0, 12);

  const highestTradingValue = themeRows[0];
  const largestUnderlying = [...themeRows].sort((left, right) => (right.marketCapB ?? -1) - (left.marketCapB ?? -1))[0];
  const lowestPe = [...themeRows].filter((row) => row.pe !== null).sort((left, right) => (left.pe ?? 999) - (right.pe ?? 999))[0];

  return (
    <div className="drCompareWorkspace">
      <section className="drCompareHero">
        <div>
          <span className="drRankingBadge">EOD Compare Desk</span>
          <h2>{modeCopy[mode].title}</h2>
          <p>{modeCopy[mode].description}</p>
        </div>
        <div className="drCompareModeTabs">
          <button className={mode === "same" ? "active" : ""} onClick={() => setMode("same")} type="button">
            Same Underlying
          </button>
          <button className={mode === "theme" ? "active" : ""} onClick={() => setMode("theme")} type="button">
            Theme / Peer Compare
          </button>
        </div>
      </section>

      <label className="drCompareSearch">
        <span>{modeCopy[mode].searchLabel}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={modeCopy[mode].placeholder}
        />
      </label>

      {mode === "same" ? (
        <section className="drComparePanel">
          <div className="drCompareSuggestionBlock">
            <span>Suggested underlyings</span>
            <div className="drComparePicker">
              {visibleChoices.map((choice) => (
                <button
                  className={choice.underlying === selectedUnderlying ? "active" : ""}
                  key={choice.underlying}
                  onClick={() => setSelectedUnderlying(choice.underlying)}
                  type="button"
                >
                  <UnderlyingLogoMark symbol={choice.underlying} className="compact" />
                  <strong>{choice.underlying}</strong>
                  <small>{choice.rows.length} DR</small>
                </button>
              ))}
            </div>
          </div>

          <div className="drCompareUnderlyingCard">
            <UnderlyingLogoMark symbol={selectedLead.underlying} className="hero" />
            <div>
              <span className="drNewKicker">Same Underlying Compare</span>
              <h2>{selectedLead.company}</h2>
              <p>{selectedLead.underlying} · {marketFromRow(selectedLead)} · {getTaxonomyCountry(selectedLead)} · {getTaxonomyPrimaryTheme(selectedLead)}</p>
            </div>
            <div className="drCompareMetricStrip">
              <article><span>Underlying Price</span><strong>{quote ? `${quote.currency} ${formatPriceValue(quote.price)}` : "—"}</strong></article>
              <article><span>Underlying 1D</span><strong>{formatPct(quote?.changePct ?? null)}</strong></article>
              <article><span>Market Cap</span><strong>{formatMarketCap(selectedLead.marketCapB)}</strong></article>
              <article><span>Dividend Yield</span><strong>{formatYield(selectedLead.dividendYield)}</strong></article>
            </div>
          </div>

          <div className="drCompareSummaryGrid">
            <article className="drCompareSummaryCard">
              <span>Best Liquidity</span>
              {bestLiquidity ? <UnderlyingLogoMark symbol={bestLiquidity.row.underlying} className="compact" /> : null}
              <strong>{bestLiquidity?.row.ticker ?? "—"}</strong>
              <p>{bestLiquidity ? summaryCardNote("liquidity", bestLiquidity.row) : "—"}</p>
            </article>
            <article className="drCompareSummaryCard">
              <span>Lowest Unit Cost</span>
              {lowestCost ? <UnderlyingLogoMark symbol={lowestCost.row.underlying} className="compact" /> : null}
              <strong>{lowestCost?.row.ticker ?? "—"}</strong>
              <p>{lowestCost ? summaryCardNote("cost", lowestCost.row) : "—"}</p>
            </article>
            <article className="drCompareSummaryCard">
              <span>Highest Yield</span>
              {highestYield ? <UnderlyingLogoMark symbol={highestYield.row.underlying} className="compact" /> : null}
              <strong>{highestYield?.row.ticker ?? "—"}</strong>
              <p>{highestYield ? summaryCardNote("yield", highestYield.row) : "—"}</p>
            </article>
            <article className="drCompareSummaryCard accent">
              <span>Best Overall</span>
              {bestOverall ? <UnderlyingLogoMark symbol={bestOverall.row.underlying} className="compact" /> : null}
              <strong>{bestOverall?.row.ticker ?? "—"}</strong>
              <p>{bestOverall ? summaryCardNote("overall", bestOverall.row) : "—"}</p>
            </article>
          </div>

          {!sameUnderlyingCanCompare ? (
            <div className="drCompareSingleNotice">
              <div>
                <strong>Only one Thai DR is available for {selectedLead.underlying}.</strong>
                <p>Switch to Theme / Peer Compare to compare this DR with similar peers in the same theme.</p>
              </div>
              <div>
                <Link href={`/dr-new/${selectedRows[0]?.ticker ?? selectedLead.ticker}`}>View {selectedRows[0]?.ticker ?? selectedLead.ticker}</Link>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTheme(selectedThemeForLead);
                    setMode("theme");
                  }}
                >
                  Compare {selectedThemeForLead} peers
                </button>
              </div>
            </div>
          ) : (
            <>
              <CompareMetricSection
                title="Price & Trading"
                note="Thai DR market data at latest close."
                rows={selectedRows}
                metrics={sameMetricsTop}
              />
              <CompareMetricSection
                title="Cost & Income"
                note="Parent-stock fundamentals shown alongside each DR choice."
                rows={selectedRows}
                metrics={sameMetricsMiddle}
              />
              <CompareMetricSection
                title="Structure"
                note="Issuer and conversion structure for each Thai DR listing."
                rows={selectedRows}
                metrics={sameMetricsBottom}
              />
              <CompareScoreTable scoredRows={scoredRows} />
              <div className="drCompareQuickRead">
                <strong>Quick Read</strong>
                {quickReadLines(scoredRows).map((line) => <p key={line}>{line}</p>)}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="drComparePanel">
          <div className="drCompareThemeBar">
            {themeOptions.map((theme) => (
              <button className={theme === selectedTheme ? "active" : ""} key={theme} onClick={() => setSelectedTheme(theme)} type="button">
                {theme}
              </button>
            ))}
          </div>

          <div className="drCompareHighlights">
            <article>
              <span>Highest Trading Value</span>
              <strong>{highestTradingValue?.ticker ?? "—"}</strong>
              <p>{highestTradingValue ? formatTradingValue(highestTradingValue.turnoverM) : "—"}</p>
            </article>
            <article>
              <span>Largest Underlying</span>
              <strong>{largestUnderlying?.underlying ?? "—"}</strong>
              <p>{largestUnderlying ? formatMarketCap(largestUnderlying.marketCapB) : "—"}</p>
            </article>
            <article>
              <span>Lowest PE</span>
              <strong>{lowestPe?.ticker ?? "—"}</strong>
              <p>{lowestPe ? formatPe(lowestPe.pe) : "—"}</p>
            </article>
          </div>

          <div className="drCompareTableHead">
            <div>
              <h3>{selectedTheme} peer comparison</h3>
              <p>Use this view when there is only one DR for an underlying or when you want similar-sector alternatives.</p>
            </div>
          </div>

          <div className="drCompareTable theme">
            <div className="header">
              <span>DR</span><span>Underlying</span><span>Company</span><span>Country</span><span>Theme</span><span>DR Price</span><span>DR 1D %</span><span>Trading Value</span><span>Market Cap</span><span>PE</span><span>Yield</span><span>Action</span>
            </div>
            {themeRows.map((row) => (
              <Link href={`/dr-new/${row.ticker}`} key={row.ticker}>
                <strong className="drCompareTickerWithLogo"><UnderlyingLogoMark symbol={row.underlying} className="compact" />{row.ticker}</strong>
                <span>{row.underlying}</span>
                <span className="drNameClamp" title={row.company}>{row.company}</span>
                <span>{getTaxonomyCountry(row)}</span>
                <span>{getTaxonomyPrimaryTheme(row)}</span>
                <span>{formatPrice(row)}</span>
                <span className={(row.changePct ?? 0) >= 0 ? "positive" : "negative"}>{formatPct(row.changePct)}</span>
                <span>{formatTradingValue(row.turnoverM)}</span>
                <span>{formatMarketCap(row.marketCapB)}</span>
                <span>{formatPe(row.pe)}</span>
                <span>{formatYield(row.dividendYield)}</span>
                <span>View</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
