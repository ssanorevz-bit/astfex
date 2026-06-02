"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DrNewRow, drNewRows } from "../mock-dr-new-data";
import { getUnderlyingEodQuote } from "../underlying-eod-quotes";

type CompareMode = "same" | "theme";

const themeOptions = ["AI", "Semiconductor", "China Tech", "EV", "Healthcare", "Finance", "ETF Income"];
const suggestedUnderlyings = ["MSFT", "NVDA", "BABA", "AMD", "AVGO", "AMZN"];

const modeCopy: Record<CompareMode, { title: string; description: string; example: string; searchLabel: string; placeholder: string }> = {
  same: {
    title: "Same Underlying",
    description: "ใช้เทียบ DR หลายตัวที่อ้างอิงหุ้นแม่ตัวเดียวกัน เช่น MSFT80 กับ MSFT06",
    example: "Compare Thai DRs that track the same parent stock. Example: MSFT80 vs MSFT06",
    searchLabel: "Search parent stock or DR",
    placeholder: "MSFT, Microsoft, MSFT80"
  },
  theme: {
    title: "Theme / Peer Compare",
    description: "ใช้เทียบ DR ในธีมหรือกลุ่มเดียวกัน เช่น AI, Semiconductor, China Tech",
    example: "Compare DRs in the same investment theme, e.g. AI, Semiconductor, China Tech.",
    searchLabel: "Search theme or DR",
    placeholder: "AI, Semiconductor, NVDA80"
  }
};

function formatPct(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPrice(row: DrNewRow) {
  return `THB ${row.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTurnover(value: number) {
  if (value >= 1) return `THB ${value.toFixed(2)}M`;
  return `THB ${(value * 1000).toFixed(0)}K`;
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

function formatRatio(row: DrNewRow) {
  const parts = row.ratio.split(":");
  if (parts.length !== 2) return row.ratio;
  const drUnits = Number(parts[1]);
  if (!Number.isFinite(drUnits)) return row.ratio;
  return `${drUnits.toLocaleString("en-US")} DR = 1 ${row.underlying}`;
}

function marketFromRow(row: DrNewRow) {
  if (row.region === "US") return "Nasdaq";
  if (row.region === "Hong Kong" || row.region === "China") return "HKEX / China";
  if (row.region === "Japan") return "Tokyo";
  if (row.region === "Vietnam") return "HOSE";
  if (row.assetType !== "Stock DR") return "ETF";
  return row.region;
}

function rowMatches(row: DrNewRow, query: string) {
  const haystack = `${row.ticker} ${row.underlying} ${row.company} ${row.issuer} ${row.theme} ${row.region}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function themeMatches(row: DrNewRow, theme: string) {
  if (theme === "AI") return /AI|Software|Quantum/i.test(row.theme);
  if (theme === "Semiconductor") return /Semiconductor/i.test(row.theme);
  if (theme === "China Tech") return /China Internet|Consumer Tech|EV/i.test(row.theme) && ["China", "Hong Kong"].includes(row.region);
  if (theme === "EV") return /EV|Battery/i.test(row.theme);
  if (theme === "Healthcare") return /Healthcare/i.test(row.theme);
  if (theme === "Finance") return /Financials/i.test(row.theme);
  return /Income|Index ETF|US Index/i.test(row.theme) || row.assetType === "ETF DR";
}

function themeFromRow(row: DrNewRow) {
  if (/China Internet|Consumer Tech|EV/i.test(row.theme) && ["China", "Hong Kong"].includes(row.region)) return "China Tech";
  if (/Semiconductor/i.test(row.theme)) return "Semiconductor";
  if (/AI|Software|Quantum/i.test(row.theme)) return "AI";
  if (/EV|Battery/i.test(row.theme)) return "EV";
  if (/Healthcare/i.test(row.theme)) return "Healthcare";
  if (/Financials/i.test(row.theme)) return "Finance";
  return "ETF Income";
}

function getUnderlyingChoices() {
  const rowsByUnderlying = new Map<string, DrNewRow[]>();
  drNewRows.forEach((row) => {
    rowsByUnderlying.set(row.underlying, [...(rowsByUnderlying.get(row.underlying) ?? []), row]);
  });

  return [...rowsByUnderlying.entries()]
    .map(([underlying, rows]) => ({ underlying, rows, lead: rows[0] }))
    .sort((left, right) => {
      if (right.rows.length !== left.rows.length) return right.rows.length - left.rows.length;
      return left.underlying.localeCompare(right.underlying);
    });
}

export function CompareWorkspace() {
  const [mode, setMode] = useState<CompareMode>("same");
  const [query, setQuery] = useState("");
  const [selectedUnderlying, setSelectedUnderlying] = useState("MSFT");
  const [selectedTheme, setSelectedTheme] = useState("AI");

  const underlyingChoices = useMemo(() => getUnderlyingChoices(), []);
  const visibleChoices = underlyingChoices
    .filter((choice) => suggestedUnderlyings.includes(choice.underlying))
    .filter((choice) => mode === "same" ? choice.rows.some((row) => rowMatches(row, query)) : true)
    .sort((left, right) => suggestedUnderlyings.indexOf(left.underlying) - suggestedUnderlyings.indexOf(right.underlying));
  const selectedRows = drNewRows.filter((row) => row.underlying === selectedUnderlying);
  const selectedLead = selectedRows[0] ?? drNewRows[0];
  const quote = getUnderlyingEodQuote(selectedLead);
  const sameUnderlyingCanCompare = selectedRows.length > 1;
  const selectedThemeForLead = themeFromRow(selectedLead);

  const themeRows = drNewRows
    .filter((row) => themeMatches(row, selectedTheme))
    .filter((row) => rowMatches(row, query))
    .sort((left, right) => right.turnoverM - left.turnoverM)
    .slice(0, 12);

  const highestTurnover = themeRows[0];
  const largestUnderlying = [...themeRows].sort((left, right) => (right.marketCapB ?? -1) - (left.marketCapB ?? -1))[0];
  const lowestPe = [...themeRows].filter((row) => row.pe !== null).sort((left, right) => (left.pe ?? 999) - (right.pe ?? 999))[0];
  const highestSameUnderlyingTurnover = [...selectedRows].sort((left, right) => right.turnoverM - left.turnoverM)[0];
  const lowestSameUnderlyingPrice = [...selectedRows].sort((left, right) => left.price - right.price)[0];

  return (
    <div className="drCompareWorkspace">
      <section className="drCompareHero">
        <div>
          <span className="drRankingBadge">EOD Data · Data as of latest close</span>
          <h2>Compare Thai DRs clearly</h2>
          <p>เทียบ DR หุ้นแม่เดียวกัน หรือเทียบ DR ในธีมเดียวกัน โดยแยกข้อมูล DR ไทยกับหุ้นแม่ให้ชัดเจน.</p>
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

      <section className="drCompareModeExplainer" aria-label={`${modeCopy[mode].title} guidance`}>
        <div>
          <strong>{modeCopy[mode].title}</strong>
          <p>{modeCopy[mode].description}</p>
        </div>
        <span>{modeCopy[mode].example}</span>
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
                  <strong>{choice.underlying}</strong>
                  <small>{choice.rows.length} DR</small>
                </button>
              ))}
            </div>
          </div>

          <div className="drCompareUnderlyingCard">
            <div>
              <span className="drNewKicker">Same Underlying</span>
              <h2>{selectedLead.company}</h2>
              <p>{selectedLead.underlying} · {marketFromRow(selectedLead)} · {selectedLead.region} · {selectedLead.theme}</p>
            </div>
            <div className="drCompareMetricStrip">
              <article><span>Underlying Price</span><strong>{quote.currency} {quote.price.toLocaleString("en-US")}</strong></article>
              <article><span>Underlying 1D</span><strong>{formatPct(quote.changePct)}</strong></article>
              <article><span>Market Cap</span><strong>{formatMarketCap(selectedLead.marketCapB)}</strong></article>
              <article><span>PE</span><strong>{formatPe(selectedLead.pe)}</strong></article>
            </div>
          </div>

          <div className="drCompareTableHead">
            <div>
              <h3>Thai DRs available: {selectedRows.length}</h3>
              <p>
                {sameUnderlyingCanCompare
                  ? "DR price and trading value are Thai market EOD data. Underlying metrics are latest available EOD data from the source market."
                  : "Only one Thai DR is currently available for this underlying. Switch to Theme / Peer Compare to compare with similar peers."}
              </p>
            </div>
          </div>

          {!sameUnderlyingCanCompare ? (
            <div className="drCompareSingleNotice">
              <div>
                <strong>Only one Thai DR is available for {selectedLead.underlying}.</strong>
                <p>Only one Thai DR is currently available for this underlying. Switch to Theme / Peer Compare to compare with similar peers.</p>
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
          ) : null}

          <div className="drCompareTable same">
            <div className="header">
              <span>DR</span><span>Issuer</span><span>Price</span><span>1D %</span><span>Trading Value</span><span>Volume</span><span>Conversion Ratio</span><span>Action</span>
            </div>
            {selectedRows.map((row) => (
              <div key={row.ticker}>
                <strong>{row.ticker}</strong>
                <span>{row.issuer}</span>
                <span>{formatPrice(row)}</span>
                <span className={row.changePct >= 0 ? "positive" : "negative"}>{formatPct(row.changePct)}</span>
                <span>{formatTurnover(row.turnoverM)}</span>
                <span>{row.volume.toLocaleString("en-US")}</span>
                <span>{formatRatio(row)}</span>
                <Link href={`/dr-new/${row.ticker}`}>View</Link>
              </div>
            ))}
          </div>

          <div className="drCompareQuickRead">
            <strong>Quick read</strong>
            {sameUnderlyingCanCompare ? (
              <>
                <p>{highestSameUnderlyingTurnover?.ticker ?? selectedLead.ticker} has higher trading value in this underlying group.</p>
                <p>{lowestSameUnderlyingPrice?.ticker ?? selectedLead.ticker} has a lower unit price in this mock set.</p>
                <p>Both track the same underlying: {selectedLead.underlying}.</p>
              </>
            ) : (
              <>
                <p>Only one Thai DR is available for {selectedLead.underlying}.</p>
                <p>Use Theme / Peer Compare to compare {selectedRows[0]?.ticker ?? selectedLead.ticker} with other {selectedThemeForLead} DRs.</p>
              </>
            )}
          </div>
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
              <strong>{highestTurnover?.ticker ?? "—"}</strong>
              <p>{highestTurnover ? formatTurnover(highestTurnover.turnoverM) : "—"}</p>
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
              <p>DR columns show Thai market data. Market cap, PE, and 1Y return are underlying EOD fields.</p>
            </div>
          </div>

          <div className="drCompareTable theme">
            <div className="header">
              <span>DR</span><span>Underlying</span><span>Company</span><span>Country</span><span>Theme</span><span>DR Price</span><span>DR 1D %</span><span>Trading Value</span><span>Market Cap</span><span>PE</span><span>1Y Return</span><span>Action</span>
            </div>
            {themeRows.map((row) => {
              const underlyingQuote = getUnderlyingEodQuote(row);
              return (
                <Link href={`/dr-new/${row.ticker}`} key={row.ticker}>
                  <strong>{row.ticker}</strong>
                  <span>{row.underlying}</span>
                  <span>{row.company}</span>
                  <span>{row.region}</span>
                  <span>{row.theme}</span>
                  <span>{formatPrice(row)}</span>
                  <span className={row.changePct >= 0 ? "positive" : "negative"}>{formatPct(row.changePct)}</span>
                  <span>{formatTurnover(row.turnoverM)}</span>
                  <span>{formatMarketCap(row.marketCapB)}</span>
                  <span>{formatPe(row.pe)}</span>
                  <span className={underlyingQuote.oneYearReturnPct >= 0 ? "positive" : "negative"}>{formatPct(underlyingQuote.oneYearReturnPct)}</span>
                  <span>View</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
