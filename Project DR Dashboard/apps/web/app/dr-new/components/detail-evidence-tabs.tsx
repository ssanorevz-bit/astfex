"use client";

import { useState } from "react";
import type { DetailChartData } from "../data/chart-data";
import type { DrNewProfile } from "../dr-new-derived";
import { getTaxonomyPrimaryTheme } from "../dr-taxonomy";
import type { DrNewRow } from "../mock-dr-new-data";
import { LightweightPriceChart, type ChartRange } from "./lightweight-price-chart";

type TabKey = "chart" | "reference";
type ChartMode = "underlying" | "dr" | "compare";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "chart", label: "Chart" },
  { key: "reference", label: "Reference" }
];

const chartModes: Array<{ key: ChartMode; label: string; description: string }> = [
  { key: "underlying", label: "Underlying Price", description: "Primary EOD price trend of the source-market stock." },
  { key: "dr", label: "DR Price", description: "Thai DR EOD price in THB." },
  { key: "compare", label: "Compare", description: "Compare performance, rebased to 100." }
];
const chartRanges: ChartRange[] = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "All"];

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPriceThb(value: number | null) {
  if (value === null) return "—";
  return `THB ${value.toFixed(2)}`;
}

function formatVolume(value: number | null) {
  if (value === null) return "—";
  return `${value.toLocaleString("en-US")} units`;
}

function formatMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}T`;
  return `$${value.toLocaleString("en-US")}B`;
}

function conversionRatioText(ratio: string, underlying: string) {
  const parts = ratio.split(":").map((part) => part.replace(/,/g, "").trim());
  if (parts.length !== 2) return ratio;
  const drUnits = Number(parts[0]);
  const underlyingUnits = Number(parts[1]);
  if (!Number.isFinite(drUnits) || !Number.isFinite(underlyingUnits)) return ratio;
  return `${drUnits.toLocaleString("en-US")} DR = ${underlyingUnits.toLocaleString("en-US")} ${underlying}`;
}

function setOfficialUrl(ticker: string) {
  return `https://www.set.or.th/th/market/product/dr/quote/${ticker.toUpperCase()}/price`;
}

function DetailField({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="drAssetFactRow">
      <dt>{label}</dt>
      <dd>
        <span>{value}</span>
        {helper ? <small>{helper}</small> : null}
      </dd>
    </div>
  );
}

function DetailLinkField({ label, href, value }: { label: string; href: string; value: string }) {
  return (
    <div className="drAssetFactRow">
      <dt>{label}</dt>
      <dd>
        <a href={href} target="_blank" rel="noreferrer">{value}</a>
      </dd>
    </div>
  );
}

export function DetailEvidenceTabs({
  row,
  exchange,
  profile,
  chartData,
  latestDividendEvent,
  latestEarnings
}: {
  row: DrNewRow;
  exchange: string;
  profile: DrNewProfile;
  chartData: DetailChartData;
  latestDividendEvent: {
    amountText: string | null;
    xdDate: string | null;
    paymentDate: string | null;
    status: string;
    sourceUrl: string | null;
  } | null;
  latestEarnings: {
    date: string;
    beatMissLabel: string | null;
    aiSummary: string | null;
    filingConfirmed: boolean | null;
    filingUrl: string | null;
  } | null;
}) {
  const [active, setActive] = useState<TabKey>("chart");
  const [chartMode, setChartMode] = useState<ChartMode>("underlying");
  const [chartRange, setChartRange] = useState<ChartRange>("All");

  return (
    <section className="drAssetTabsShell">
      <div className="drNewTabs" role="tablist" aria-label={`${row.ticker} detail tabs`}>
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            className={active === tab.key ? "active" : ""}
            key={tab.key}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="drNewTabPanel" role="tabpanel">
        {active === "chart" ? (
          <article className="drNewTabSection">
            <div className="drNewChartHeader">
              <div>
                <h2>{chartModes.find((mode) => mode.key === chartMode)?.label}</h2>
                <p>{chartModes.find((mode) => mode.key === chartMode)?.description}</p>
              </div>
              <div className="drNewChartModeToggle" aria-label="Chart mode">
                {chartModes.map((mode) => (
                  <button
                    type="button"
                    className={chartMode === mode.key ? "active" : ""}
                    onClick={() => setChartMode(mode.key)}
                    key={mode.key}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="drNewChartLegend">
              {(chartMode === "underlying" || chartMode === "compare") ? <span><i className="drLineUnderlying" /> Underlying Price</span> : null}
              {(chartMode === "dr" || chartMode === "compare") ? <span><i className="drLineDr" /> DR Price</span> : null}
              {chartMode === "compare" ? <span>Compare performance, rebased to 100</span> : null}
            </div>
            <div className={`drNewChartPanel ${chartMode}`} aria-label={`${row.ticker} EOD chart`}>
              <LightweightPriceChart mode={chartMode} range={chartRange} chartData={chartData} ticker={row.ticker} underlying={row.underlying} />
            </div>
            <p className="drNewChartAttribution">
              Charts powered by <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts</a>
            </p>
            <div className="drNewChartControls" aria-label="Chart time range">
              {chartRanges.map((range) => (
                <button type="button" className={range === chartRange ? "active" : ""} onClick={() => setChartRange(range)} key={range}>
                  {range}
                </button>
              ))}
            </div>
            <p className="drAssetDataNote">Price data is based on latest available EOD close. DR and underlying markets may close at different times. Compare mode is normalized and does not imply a tradable price.</p>
          </article>
        ) : null}

        {active === "reference" ? (
          <article className="drNewTabSection">
            <h2>Reference</h2>
            <p>รายละเอียดเชิงอ้างอิงของ DR, ลิงก์ทางการ, และ note สำคัญสำหรับใช้ตรวจสอบต่อหลังจากอ่าน decision layer ด้านบน.</p>
            <div className="drAssetInfoGrid">
              <section>
                <h3>DR Information</h3>
                <dl>
                  <DetailField label="DR Symbol" value={row.ticker} />
                  <DetailField label="Issuer" value={row.issuer} />
                  <DetailField label="Conversion Ratio" value={conversionRatioText(row.ratio, row.underlying)} />
                  <DetailField label="Trading Currency" value="THB" />
                  <DetailField label="Volume" value={formatVolume(row.volume)} />
                  <DetailField label="First Trading Date" value={row.firstTradeDate ?? "—"} />
                </dl>
              </section>
              <section>
                <h3>Underlying Reference</h3>
                <dl>
                  <DetailField label="Ticker" value={row.underlying} />
                  <DetailField label="Market" value={exchange} />
                  <DetailField label="Theme" value={getTaxonomyPrimaryTheme(row)} />
                  <DetailField label="Sector" value={profile.sector} />
                  <DetailField label="Market Cap" value={formatMarketCap(row.marketCapB)} />
                  <DetailField label="Dividend Yield" value={row.dividendYield === null ? "—" : `${row.dividendYield.toFixed(2)}%`} />
                </dl>
              </section>
              <section className="wide">
                <h3>Official Links</h3>
                <dl className="drAssetFactTable compact">
                  <DetailLinkField label="Official SET Page" href={setOfficialUrl(row.ticker)} value="View on SET" />
                  {row.documents?.[0] ? (
                    <DetailLinkField label="Prospectus / Memorandum" href={row.documents[0].url} value="Open document" />
                  ) : null}
                  {latestDividendEvent?.sourceUrl ? (
                    <DetailLinkField label="Dividend Source" href={latestDividendEvent.sourceUrl} value="Open dividend source" />
                  ) : null}
                  {latestEarnings?.filingUrl ? (
                    <DetailLinkField label="Filing Link" href={latestEarnings.filingUrl} value="Open filing" />
                  ) : null}
                </dl>
              </section>
            </div>
            <details className="drAssetOfficialDetails">
              <summary>Dividend Note</summary>
              <p>
                {latestDividendEvent
                  ? `${row.ticker} latest dividend status: ${latestDividendEvent.status}. XD ${latestDividendEvent.xdDate ?? "—"} · Payment ${latestDividendEvent.paymentDate ?? "—"} · Amount ${latestDividendEvent.amountText ?? "—"}`
                  : row.dividendYield === null
                    ? "No announced Thai DR dividend in the current dataset."
                    : `Underlying dividend yield: ${row.dividendYield.toFixed(2)}%. Thai DR dividend dates may differ from the source market.`}
              </p>
            </details>
            <details className="drAssetOfficialDetails">
              <summary>Earnings Note</summary>
              <p>
                {latestEarnings
                  ? `${row.underlying} latest earnings date ${latestEarnings.date}${latestEarnings.beatMissLabel ? ` · ${latestEarnings.beatMissLabel}` : ""}${latestEarnings.aiSummary ? ` · ${latestEarnings.aiSummary}` : ""}`
                  : `No earnings note is attached to ${row.underlying} in the current EOD dataset.`}
              </p>
            </details>
          </article>
        ) : null}

      </div>
    </section>
  );
}
