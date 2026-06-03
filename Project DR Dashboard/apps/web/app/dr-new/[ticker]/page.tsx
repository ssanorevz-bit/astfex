import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailEvidenceTabs } from "../components/detail-evidence-tabs";
import { getCompareSameUnderlying, getSingleDrDetail } from "../data";
import { getSingleDrChartData } from "../data/chart-data";
import { getDrNewProfile } from "../dr-new-derived";
import type { DrNewRow } from "../mock-dr-new-data";
import { formatUnderlyingPrice, getUnderlyingEodQuote } from "../underlying-eod-quotes";

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPriceThb(value: number | null) {
  if (value === null) return "—";
  return `THB ${value.toFixed(2)}`;
}

function formatTradingValue(value: number | null) {
  if (value === null) return "—";
  if (value >= 1) return `THB ${value.toFixed(2)}M`;
  return `THB ${(value * 1000).toFixed(0)}K`;
}

function conversionRatioText(ratio: string, underlying: string) {
  const [, drUnits] = ratio.split(":");
  const units = Number(drUnits);
  if (!Number.isFinite(units)) return ratio;
  return `${units.toLocaleString("en-US")} DR = 1 ${underlying}`;
}

function underlyingExchange(row: DrNewRow) {
  const nasdaqTickers = new Set(["NVDA", "TSLA", "AMD", "BIDU", "MU", "AVGO", "AMZN", "MSFT", "META", "GOOG", "NFLX", "IONQ", "RKLB", "PLTR", "QQQ", "RGTI"]);
  const nyseTickers = new Set(["BABA", "LLY", "SPY", "JEPI", "V", "MA", "USO"]);
  if (row.region === "US") {
    if (nasdaqTickers.has(row.underlying)) return "Nasdaq";
    if (nyseTickers.has(row.underlying)) return "NYSE";
    return "US market";
  }
  if (row.region === "Hong Kong") return "Hong Kong";
  if (row.region === "China") return "China A/H";
  if (row.region === "Japan") return "Tokyo";
  if (row.region === "Vietnam") return "HOSE";
  if (row.region === "Europe") return "Europe";
  if (row.region === "Other Asia") return "Singapore";
  return "Primary market";
}

function setOfficialUrl(ticker: string) {
  return `https://www.set.or.th/th/market/product/dr/quote/${ticker}/price`;
}

export default async function DrDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const row = getSingleDrDetail(ticker);
  if (!row) notFound();

  const profile = getDrNewProfile(row);
  const underlyingQuote = getUnderlyingEodQuote(row);
  const sameUnderlyingRows = getCompareSameUnderlying(row.underlying);
  const chartData = getSingleDrChartData(row);
  const exchange = underlyingExchange(row);

  return (
    <div className="drNewApp drAssetDetailApp">
      <aside className="drNewRail" aria-label="Thai DR navigation">
        <Link className="drNewBrand clean" href="/dr-new">
          <span>DR</span>
          <strong>Thai DR</strong>
        </Link>
        <nav className="drNewNav">
          <div className="drNewNavGroup">
            <span>Discover</span>
            <Link className="active" href="/dr-new">DR Screener</Link>
            <Link href="/dr-new/rankings">Rankings</Link>
            <Link href="/dr-new/dividends">Dividends</Link>
            <Link href="/dr-new/calendar">Calendar</Link>
          </div>
          <div className="drNewNavGroup">
            <span>Tools</span>
            <Link href="/dr-new/compare">Compare</Link>
            <Link href="/dr-new/watchlist">Watchlist</Link>
          </div>
          <div className="drNewNavGroup">
            <span>Education</span>
            <Link href="/dr-new/learn">Learn</Link>
          </div>
        </nav>
      </aside>

      <main className="drNewMain drAssetDetailMain">
        <div className="drNewBreadcrumb">
          <Link href="/dr-new">Underlying Directory</Link>
          <span>/</span>
          <span>{row.ticker}</span>
        </div>

        <section className="drAssetHero">
          <div className="drAssetHeroCopy">
            <p>Thai DR</p>
            <h1>{row.ticker}</h1>
            <h2>{row.company} DR</h2>
            <div className="drNewFactPills">
              <span>Issuer: {row.issuer}</span>
              <span>Underlying: {row.underlying}</span>
              <span>{exchange}</span>
              <span>{row.region}</span>
              <span>THB</span>
            </div>
          </div>
          <div className="drNewDetailActions" aria-label={`${row.ticker} actions`}>
            <button type="button">Add Watchlist</button>
            <Link href={`/dr-new/compare?underlying=${row.underlying}`}>Compare Thai DRs</Link>
            <Link href={`/dr-new/dividends?dr=${row.ticker}`}>Dividends</Link>
            <Link href={`/dr-new/calendar?dr=${row.ticker}`}>Calendar</Link>
            <a href={row.officialSetPageUrl ?? setOfficialUrl(row.ticker)} target="_blank" rel="noreferrer">
              Official SET Page
            </a>
          </div>
        </section>

        <section className="drAssetMetricPanel" aria-label={`${row.ticker} key metrics`}>
          <div className="drAssetPrimaryQuote">
            <div>
              <span>DR Price</span>
              <strong>{formatPriceThb(row.price)}</strong>
              <small>Thai market EOD</small>
            </div>
            <div>
              <span>DR 1D Change</span>
              <strong className={(row.changePct ?? 0) >= 0 ? "positive" : "negative"}>{formatPct(row.changePct)}</strong>
              <small>Latest DR close</small>
            </div>
          </div>

          <dl className="drAssetMetricList">
            <div>
              <dt>Trading Value</dt>
              <dd>{formatTradingValue(row.turnoverM)}</dd>
            </div>
            <div>
              <dt>Conversion Ratio</dt>
              <dd>{conversionRatioText(row.ratio, row.underlying)}</dd>
            </div>
            <div>
              <dt>Underlying Price</dt>
              <dd>{row.underlying} · {formatUnderlyingPrice(underlyingQuote)}</dd>
            </div>
            <div>
              <dt>Underlying 1D</dt>
              <dd className={(underlyingQuote?.changePct ?? 0) >= 0 ? "positive" : "negative"}>{formatPct(underlyingQuote?.changePct ?? null)}</dd>
            </div>
          </dl>
          <p className="drAssetDataNote">Data as of latest EOD close. DR and underlying markets may close at different times.</p>
        </section>

        <DetailEvidenceTabs row={row} compareRows={sameUnderlyingRows} exchange={exchange} profile={profile} chartData={chartData} />
      </main>
    </div>
  );
}
