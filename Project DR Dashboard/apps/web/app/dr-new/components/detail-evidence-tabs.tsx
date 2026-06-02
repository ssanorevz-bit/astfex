"use client";

import { useState } from "react";
import type { DrNewProfile } from "../dr-new-derived";
import type { DrNewRow } from "../mock-dr-new-data";
import { formatUnderlyingPrice, getUnderlyingEodQuote } from "../underlying-eod-quotes";

type TabKey = "overview" | "chart" | "drDetails" | "underlying" | "dividends";
type ChartMode = "underlying" | "dr" | "compare";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "chart", label: "Chart" },
  { key: "drDetails", label: "DR Details" },
  { key: "underlying", label: "Underlying" },
  { key: "dividends", label: "Dividends" }
];

const chartModes: Array<{ key: ChartMode; label: string; description: string }> = [
  { key: "underlying", label: "Underlying Price", description: "Primary EOD price trend of the source-market stock." },
  { key: "dr", label: "DR Price", description: "Thai DR EOD price in THB." },
  { key: "compare", label: "Compare", description: "Compare performance, rebased to 100." }
];

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatTradingValue(value: number) {
  if (value >= 1) return `THB ${value.toFixed(2)}M`;
  return `THB ${(value * 1000).toFixed(0)}K`;
}

function conversionRatioText(ratio: string, underlying: string) {
  const [, drUnits] = ratio.split(":");
  const units = Number(drUnits);
  if (!Number.isFinite(units)) return ratio;
  return `${units.toLocaleString("en-US")} DR = 1 ${underlying}`;
}

function conversionRatioHelper(row: DrNewRow) {
  const [, drUnits] = row.ratio.split(":");
  const units = Number(drUnits);
  if (!Number.isFinite(units)) return "Number of DR units equivalent to 1 underlying share.";
  return `${units.toLocaleString("en-US")} units of ${row.ticker} represent 1 share of ${row.underlying}.`;
}

function setOfficialUrl(ticker: string) {
  return `https://www.set.or.th/th/market/product/dr/quote/${ticker}/price`;
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

function DetailSectionHeader({ label }: { label: string }) {
  return <div className="drAssetFactSection">{label}</div>;
}

export function DetailEvidenceTabs({
  row,
  compareRows,
  exchange,
  profile
}: {
  row: DrNewRow;
  compareRows: DrNewRow[];
  exchange: string;
  profile: DrNewProfile;
}) {
  const [active, setActive] = useState<TabKey>("overview");
  const [chartMode, setChartMode] = useState<ChartMode>("underlying");
  const underlyingQuote = getUnderlyingEodQuote(row);
  const otherDrRows = compareRows.filter((item) => item.ticker !== row.ticker);

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
        {active === "overview" ? (
          <div className="drNewOverviewStack">
            <article className="drNewTabSection">
              <h2>About this DR</h2>
              <p>
                {row.ticker} is a Thai DR issued by {row.issuer} that tracks {row.company} ({row.underlying}), traded on {exchange}. It allows Thai investors to gain exposure to {row.company} through the Thai market in THB.
              </p>
              <dl className="drAssetFactTable">
                <DetailField label="DR Symbol" value={row.ticker} />
                <DetailField label="Issuer" value={row.issuer} />
                <DetailField label="Underlying" value={row.underlying} />
                <DetailField label="Company" value={row.company} />
                <DetailField label="Underlying Market" value={exchange} />
                <DetailField label="Country" value={row.region} />
                <DetailField label="Theme / Sector" value={row.theme} />
                <DetailField label="Trading Currency" value="THB" />
                <DetailField label="Conversion Ratio" value={conversionRatioText(row.ratio, row.underlying)} />
              </dl>
            </article>

            {otherDrRows.length > 0 ? (
              <article className="drNewTabSection">
                <h2>Other Thai DRs for {row.underlying}</h2>
                <div className="drNewMiniTable" role="table" aria-label={`Other Thai DRs for ${row.underlying}`}>
                  <div className="drNewMiniRow header" role="row">
                    <span>DR</span>
                    <span>Issuer</span>
                    <span>Price</span>
                    <span>1D %</span>
                    <span>Trading Value</span>
                    <span>Ratio</span>
                    <span>Action</span>
                  </div>
                  {compareRows.map((item) => (
                    <div className="drNewMiniRow" role="row" key={item.ticker}>
                      <strong>{item.ticker}</strong>
                      <span>{item.issuer}</span>
                      <span>THB {item.price.toFixed(2)}</span>
                      <span className={item.changePct >= 0 ? "positive" : "negative"}>{formatPct(item.changePct)}</span>
                      <span>{formatTradingValue(item.turnoverM)}</span>
                      <span>{conversionRatioText(item.ratio, item.underlying)}</span>
                      {item.ticker === row.ticker ? <span>Current</span> : <a href={`/dr-new/${item.ticker}`}>View</a>}
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        ) : null}

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
                    {mode.label === "Underlying Price" ? "Underlying" : mode.label === "DR Price" ? "DR" : mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="drNewChartLegend">
              {(chartMode === "underlying" || chartMode === "compare") ? <span><i className="drLineUnderlying" /> Underlying Price</span> : null}
              {(chartMode === "dr" || chartMode === "compare") ? <span><i className="drLineDr" /> DR Price</span> : null}
              {chartMode === "compare" ? <span>Compare performance, rebased to 100</span> : null}
            </div>
            <div className={`drNewChartMock ${chartMode}`} aria-label={`${row.ticker} EOD chart mock`}>
              {(chartMode === "underlying" || chartMode === "compare") ? <span className="line underlying" /> : null}
              {(chartMode === "dr" || chartMode === "compare") ? <span className="line dr" /> : null}
              <span className="marker">
                <strong>{chartMode === "dr" ? row.ticker : chartMode === "compare" ? `${row.underlying} / ${row.ticker}` : row.underlying}</strong>
                <small>Latest available EOD close</small>
              </span>
            </div>
            <div className="drNewChartControls" aria-label="Chart time range">
              {["1M", "3M", "6M", "YTD", "1Y", "3Y", "Max"].map((range) => (
                <button type="button" className={range === "1Y" ? "active" : ""} key={range}>
                  {range}
                </button>
              ))}
            </div>
            <p className="drAssetDataNote">Price data is based on latest available EOD close. DR and underlying markets may close at different times. Compare mode is normalized and does not imply a tradable price.</p>
          </article>
        ) : null}

        {active === "drDetails" ? (
          <article className="drNewTabSection">
            <dl className="drAssetFactTable">
              <DetailSectionHeader label="Basic Info" />
              <DetailField label="DR Symbol" value={row.ticker} />
              <DetailField label="Issuer" value={row.issuer} />
              <DetailField label="Underlying" value={row.underlying} />
              <DetailField label="Underlying Exchange" value={exchange} />
              <DetailField label="Trading Exchange" value="SET" />
              <DetailField label="Trading Currency" value="THB" />
              <DetailSectionHeader label="Trading Data" />
              <DetailField label="DR Price" value={`THB ${row.price.toFixed(2)}`} />
              <DetailField label="DR 1D Change" value={formatPct(row.changePct)} />
              <DetailField label="Trading Value" value={formatTradingValue(row.turnoverM)} />
              <DetailField label="Volume" value={`${row.volume.toLocaleString("en-US")} units`} />
              <DetailSectionHeader label="Terms & Documents" />
              <DetailField
                label="Conversion Ratio"
                value={conversionRatioText(row.ratio, row.underlying)}
                helper={conversionRatioHelper(row)}
              />
              <DetailField label="Outstanding Units" value="—" />
              <DetailField label="First Trading Date" value="—" />
              <DetailLinkField label="Official SET Page" href={setOfficialUrl(row.ticker)} value="View on SET" />
              <DetailField label="Documents" value="—" />
            </dl>
          </article>
        ) : null}

        {active === "underlying" ? (
          <article className="drNewTabSection">
            <div className="drAssetUnderlyingIntro">
              <div>
                <h2>{row.company}</h2>
                <p>{row.underlying} · {exchange} · {row.region} · {profile.sector}</p>
              </div>
            </div>
            <div className="drAssetUnderlyingCards" aria-label={`${row.underlying} underlying summary`}>
              <article>
                <span>Price</span>
                <strong>{formatUnderlyingPrice(underlyingQuote)}</strong>
              </article>
              <article>
                <span>1D</span>
                <strong className={underlyingQuote.changePct >= 0 ? "positive" : "negative"}>{formatPct(underlyingQuote.changePct)}</strong>
              </article>
              <article>
                <span>Market Cap</span>
                <strong>{row.marketCapB === null ? "—" : `$${row.marketCapB.toLocaleString("en-US")}B`}</strong>
              </article>
              <article>
                <span>PE</span>
                <strong>{row.pe === null ? "—" : `${row.pe.toFixed(1)}x`}</strong>
              </article>
              <article>
                <span>1Y Return</span>
                <strong className={underlyingQuote.oneYearReturnPct >= 0 ? "positive" : "negative"}>{formatPct(underlyingQuote.oneYearReturnPct)}</strong>
              </article>
            </div>
            <dl className="drAssetFactTable">
              <DetailField label="Ticker" value={row.underlying} />
              <DetailField label="Company" value={row.company} />
              <DetailField label="Country" value={row.region} />
              <DetailField label="Exchange" value={exchange} />
              <DetailField label="Sector" value={profile.sector} />
              <DetailField label="Theme" value={row.theme} />
              <DetailField label="Underlying Price" value={formatUnderlyingPrice(underlyingQuote)} />
              <DetailField label="Underlying 1D %" value={formatPct(underlyingQuote.changePct)} />
              <DetailField label="Market Cap" value={row.marketCapB === null ? "—" : `$${row.marketCapB.toLocaleString("en-US")}B`} />
              <DetailField label="PE Ratio" value={row.pe === null ? "—" : `${row.pe.toFixed(1)}x`} />
              <DetailField label="Dividend Yield" value={row.dividendYield === null ? "—" : `${row.dividendYield.toFixed(1)}%`} />
              <DetailField label="1Y Return" value={formatPct(underlyingQuote.oneYearReturnPct)} />
            </dl>
          </article>
        ) : null}

        {active === "dividends" ? (
          <article className="drNewTabSection">
            <div className="drAssetDividendSummary">
              <div><span>Dividend Yield</span><strong>{row.dividendYield === null ? "—" : `${row.dividendYield.toFixed(2)}%`}</strong></div>
              <div><span>Last Thai DR Dividend</span><strong>—</strong></div>
              <div><span>Last XD Date</span><strong>—</strong></div>
              <div><span>Next Dividend</span><strong>Not Announced</strong></div>
            </div>
            <p className="drNewMutedNote">Dividend data is separated because underlying dividends and Thai DR dividends can have different dates and currencies.</p>
            <div className="drNewDividendSplit">
              <section>
                <h3>Underlying Dividend</h3>
                <div className="drAssetDividendTable">
                  <div className="header"><span>Ex-Date</span><span>Payment Date</span><span>Amount</span><span>Currency</span><span>Type</span></div>
                  <div className="drAssetDividendEmpty">No recent underlying dividend found.</div>
                </div>
              </section>
              <section>
                <h3>DR Dividend</h3>
                <div className="drAssetDividendTable">
                  <div className="header"><span>XD Date</span><span>Payment Date</span><span>Amount / DR</span><span>Currency</span><span>Status</span></div>
                  <div className="drAssetDividendEmpty">No announced Thai DR dividend yet.</div>
                </div>
              </section>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
