import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailPerformanceChart, DetailReferenceSection } from "../components/detail-evidence-tabs";
import { UnderlyingLogoMark } from "../components/underlying-logo-mark";
import {
  calendarEvents,
  getCompareSameUnderlying,
  getSingleDrDetail,
  getThaiDrBySymbol,
  getUnderlyingBySymbol,
  getUnderlyingFundamentalsAsOfDate,
  getUnderlyingPriceAsOfDate,
  thaiDrDividendEvents,
} from "../data";
import { getSingleDrChartData } from "../data/chart-data";
import { getDrNewProfile } from "../dr-new-derived";
import { getTaxonomyCountry, getTaxonomyPrimaryTheme } from "../dr-taxonomy";
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

function formatValueCompact(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}B`;
  if (value >= 1) return `${value.toFixed(2)}M`;
  return `${(value * 1000).toFixed(0)}K`;
}

function formatMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}T`;
  return `$${value.toLocaleString("en-US")}B`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function latestEodDateBangkok() {
  const bangkokNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  bangkokNow.setDate(bangkokNow.getDate() - 1);
  bangkokNow.setHours(0, 0, 0, 0);
  return bangkokNow;
}

function formatDisplayDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function formatThaiTradingDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(parsed);
}

function formatMonthYearEn(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(parsed);
}

function tradingValueTone(value: number | null) {
  if (value === null) return "ยังไม่มีข้อมูล Trading Value";
  if (value >= 20) return "สภาพคล่องอยู่ในระดับสูง";
  if (value >= 5) return "Trading Value อยู่ในระดับปานกลาง";
  if (value >= 1) return "Trading Value ยังใช้ได้ในระดับติดตาม";
  return "สภาพคล่องค่อนข้างบาง ควรระวังจังหวะเข้าออก";
}

function ratingLabel(row: DrNewRow) {
  const turnover = row.turnoverM ?? 0;
  if (turnover >= 20 && row.status === "live") return "น่าดูมาก";
  if (turnover >= 5) return "ค่อนข้างน่าสนใจ";
  if (turnover >= 1) return "ดูเพิ่มก่อนตัดสินใจ";
  return "เลือกด้วยความระวัง";
}

function yesNoIcon(value: boolean) {
  return value ? "OK" : "Watch";
}

function buildStrengths(row: DrNewRow, topLiquidityTicker: string | null, hasDividendOrIssuerData: boolean) {
  const strengths = [
    `อ้างอิงหุ้น ${row.company}`,
    "ซื้อขายเป็นเงินบาทในตลาดหลักทรัพย์ไทย",
    (row.turnoverM ?? 0) >= 5 || topLiquidityTicker === row.ticker
      ? `มีมูลค่าการซื้อขายโดดเด่นเมื่อเทียบกับ DR อื่นที่อ้างอิง ${row.underlying}`
      : "มีข้อมูล Trading Value ให้ใช้เช็กสภาพคล่องก่อนซื้อขาย",
  ];
  strengths.push(
    hasDividendOrIssuerData
      ? "มีข้อมูลปันผล / issuer สำหรับใช้ประกอบการตัดสินใจ"
      : "มีข้อมูลราคา หุ้นแม่ และอัตราแปลงสภาพให้ตรวจสอบ",
  );
  return strengths.slice(0, 4);
}

function buildCautions(row: DrNewRow, sameUnderlyingCount: number) {
  const cautions = [
    sameUnderlyingCount > 1
      ? "มี DR ไทยหลายตัวที่อ้างอิงหุ้นแม่เดียวกัน ควรเปรียบเทียบก่อนตัดสินใจ"
      : "ควรตรวจสอบว่ามี DR ตัวอื่นในหุ้นแม่เดียวกันเพิ่มเติมหรือไม่",
    "ตรวจสอบราคาเสนอซื้อ / เสนอขาย รวมถึง issuer และอัตราแปลงสภาพก่อนส่งคำสั่ง",
    "ราคา DR อาจไม่เคลื่อนไหวเท่าหุ้นแม่ทุกช่วงเวลา",
    "ข้อมูลเป็น EOD ไม่ใช่ราคา real-time",
  ];
  if ((row.turnoverM ?? 0) < 1) cautions[0] = "สภาพคล่องค่อนข้างบาง ควรระวังจังหวะซื้อขาย";
  return cautions.slice(0, 4);
}

function buildRelatedBadge(currentTicker: string, topLiquidityTicker: string | null, rowTicker: string) {
  if (rowTicker === currentTicker) return "Current";
  if (topLiquidityTicker && rowTicker === topLiquidityTicker) return "Highest Liquidity";
  return null;
}

function conversionRatioText(ratio: string, underlying: string) {
  const parts = ratio.split(":").map((part) => part.replace(/,/g, "").trim());
  if (parts.length !== 2) return ratio;
  const drUnits = Number(parts[0]);
  const underlyingUnits = Number(parts[1]);
  if (!Number.isFinite(drUnits) || !Number.isFinite(underlyingUnits)) return ratio;
  return `${drUnits.toLocaleString("en-US")} DR = ${underlyingUnits.toLocaleString("en-US")} ${underlying}`;
}

function underlyingExchange(row: DrNewRow) {
  const nasdaqTickers = new Set(["NVDA", "TSLA", "AMD", "BIDU", "MU", "AVGO", "AMZN", "MSFT", "META", "GOOG", "NFLX", "IONQ", "RKLB", "PLTR", "QQQ", "RGTI"]);
  const nyseTickers = new Set(["BABA", "LLY", "SPY", "JEPI", "V", "MA", "USO"]);
  const country = getTaxonomyCountry(row);
  if (country === "US") {
    if (nasdaqTickers.has(row.underlying)) return "Nasdaq";
    if (nyseTickers.has(row.underlying)) return "NYSE";
    return "US market";
  }
  if (country === "Hong Kong") return "Hong Kong";
  if (country === "China") return "China A/H";
  if (country === "Japan") return "Tokyo";
  if (country === "Vietnam") return "HOSE";
  if (country === "Europe") return "Europe";
  if (country === "Singapore") return "Singapore";
  if (country === "Taiwan") return "Taiwan";
  return "Primary market";
}

function marketCloseLabel(exchange: string | null, fallback = "ตลาดต่างประเทศ") {
  const value = (exchange ?? "").toLowerCase();
  if (!value) return fallback;
  if (value.includes("set")) return "SET Close";
  if (value.includes("nasdaq")) return "NASDAQ Close";
  if (value.includes("nyse")) return "NYSE Close";
  if (value.includes("hong kong") || value.includes("hkex")) return "HKEX Close";
  if (value.includes("tokyo") || value.includes("tse")) return "TSE Close";
  if (value.includes("singapore") || value.includes("sgx")) return "SGX Close";
  if (value.includes("hochiminh") || value.includes("hose")) return "HOSE Close";
  if (value.includes("euronext") || value.includes("europe")) return "Euronext Close";
  if (value.includes("taiwan")) return "TSE Close";
  if (value.includes("china")) return "ตลาดต่างประเทศ";
  return fallback;
}

function dataTimestampRow(label: string, marketLabel: string, dateText: string, note?: string) {
  return { label, marketLabel, dateText, note };
}

function setOfficialUrl(ticker: string) {
  return `https://www.set.or.th/th/market/product/dr/quote/${ticker.toUpperCase()}/price`;
}

export default async function DrDetailPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const row = getSingleDrDetail(ticker);
  if (!row) notFound();

  const profile = getDrNewProfile(row);
  const taxonomyCountry = getTaxonomyCountry(row);
  const primaryTheme = getTaxonomyPrimaryTheme(row);
  const underlyingQuote = getUnderlyingEodQuote(row);
  const sameUnderlyingRows = getCompareSameUnderlying(row.underlying);
  const chartData = getSingleDrChartData(row);
  const exchange = underlyingExchange(row);
  const drRecord = getThaiDrBySymbol(row.ticker);
  const underlyingRecord = getUnderlyingBySymbol(row.underlying);
  const drMarketDate = drRecord?.asOfDate ?? null;
  const underlyingMarketDate = getUnderlyingPriceAsOfDate(row.underlying);
  const fundamentalsDate = getUnderlyingFundamentalsAsOfDate(row.underlying);
  const drDateText = formatThaiTradingDate(drMarketDate) ?? "ไม่พบวันที่อัปเดต";
  const underlyingDateText = formatThaiTradingDate(underlyingMarketDate) ?? "ยังไม่มีวันที่อัปเดตของหุ้นอ้างอิง";
  const fundamentalsMonthYear = formatMonthYearEn(fundamentalsDate);
  const fundamentalsDateText = fundamentalsMonthYear ? `Updated ${fundamentalsMonthYear}` : "ยังไม่มีวันที่อัปเดตของข้อมูลงบการเงิน";
  const drCloseLabel = marketCloseLabel("SET");
  const underlyingCloseLabel = marketCloseLabel(underlyingRecord?.exchange ?? exchange);
  const datesDiffer = Boolean(drMarketDate && underlyingMarketDate && drMarketDate !== underlyingMarketDate);
  const underlyingTimestampCaption = underlyingMarketDate
    ? `${underlyingCloseLabel} · ${underlyingDateText}`
    : underlyingDateText;
  const topLiquidityTicker = [...sameUnderlyingRows]
    .sort((left, right) => (right.turnoverM ?? -1) - (left.turnoverM ?? -1))[0]?.ticker ?? null;
  const currentDividendEvents = thaiDrDividendEvents
    .filter((event) => event.drSymbol.toUpperCase() === row.ticker.toUpperCase())
    .sort((left, right) => (left.xdDate ?? left.paymentDate ?? "9999-12-31").localeCompare(right.xdDate ?? right.paymentDate ?? "9999-12-31"));
  const nextDividendEvent = currentDividendEvents.find((event) => (event.xdDate ?? event.paymentDate ?? "9999-12-31") >= todayIso()) ?? null;
  const latestDividendEvent = [...currentDividendEvents].reverse().find((event) => Boolean(event.xdDate || event.paymentDate)) ?? null;
  const earningsForUnderlying = calendarEvents
    .filter((event) => event.type === "Earnings" && event.underlyingSymbol.toUpperCase() === row.underlying.toUpperCase())
    .sort((left, right) => left.date.localeCompare(right.date));
  const nextEarnings = earningsForUnderlying.find((event) => event.date >= todayIso()) ?? null;
  const latestEarnings = [...earningsForUnderlying].reverse().find((event) => event.date < todayIso()) ?? earningsForUnderlying.at(-1) ?? null;
  const hasDividendOrIssuerData = row.dividendYield !== null || currentDividendEvents.length > 0 || Boolean(row.issuer);
  const strengths = buildStrengths(row, topLiquidityTicker, hasDividendOrIssuerData);
  const cautions = buildCautions(row, sameUnderlyingRows.length);
  const eodReferenceLabel = formatDisplayDate(latestEodDateBangkok());
  const drMove = row.changePct ?? null;
  const underlyingMove = underlyingQuote?.changePct ?? null;

  return (
    <div className="drNewApp drAssetDetailApp">
      <aside className="drNewRail" aria-label="Thai DR navigation">
        <Link className="drNewBrand clean" href="/dr-new">
          <span>DR</span>
          <span className="drNewBrandCopy">
            <strong>Thai DR Terminal</strong>
            <small>Global DR Intelligence</small>
          </span>
        </Link>
        <nav className="drNewNav">
          <div className="drNewNavGroup">
            <span>Discover</span>
            <Link className="active" href="/dr-new">DR Screener</Link>
            <Link href="/dr-new/market-map">Market Map</Link>
            <Link href="/dr-new/dividends">Dividends</Link>
            <Link href="/dr-new/calendar">Calendar</Link>
          </div>
          <div className="drNewNavGroup">
            <span>Tools</span>
            <Link href="/dr-new/compare">Compare DR</Link>
          </div>
          <div className="drNewNavGroup">
            <span>Education</span>
            <Link href="/dr-new/learn">DR Academy</Link>
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
          <div className="drAssetHeroIdentity">
            <UnderlyingLogoMark symbol={row.underlying} className="hero" />
            <div className="drAssetHeroIdentityCopy">
              <span>Tracks</span>
              <strong>{row.company}</strong>
              <small>{taxonomyCountry} · {row.underlyingCurrency ?? underlyingQuote?.currency ?? "—"}</small>
              <em>{primaryTheme}</em>
            </div>
          </div>
          <div className="drAssetHeroCopy">
            <p>Thai DR</p>
            <h1>{row.ticker}</h1>
            <h2>{row.company}</h2>
            <div className="drAssetHeroQuote">
              <strong>{formatPriceThb(row.price)}</strong>
              <span className={(row.changePct ?? 0) >= 0 ? "positive" : "negative"}>{formatPct(row.changePct)}</span>
            </div>
            <div className="drNewFactPills">
              <span>{taxonomyCountry}</span>
              <span>{profile.sector}</span>
              <span>{primaryTheme}</span>
              <span>{row.underlying}</span>
            </div>
          </div>
        </section>

        <section className="drAssetMetricPanel" aria-label={`${row.ticker} key metrics`}>
          <dl className="drAssetMetricList">
            <div>
              <dt>DR Price</dt>
              <dd>{formatPriceThb(row.price)}<small>{drCloseLabel} · {drDateText}</small></dd>
            </div>
            <div>
              <dt>Trading Value</dt>
              <dd>{formatTradingValue(row.turnoverM)}<small>{tradingValueTone(row.turnoverM)} · EOD close {eodReferenceLabel}</small></dd>
            </div>
            <div>
              <dt>Conversion Ratio</dt>
              <dd>{conversionRatioText(row.ratio, row.underlying)}</dd>
            </div>
            <div>
              <dt>Underlying Price</dt>
              <dd>
                {row.underlying} · {formatUnderlyingPrice(underlyingQuote)} <small className={(underlyingQuote?.changePct ?? 0) >= 0 ? "positive" : "negative"}>{formatPct(underlyingQuote?.changePct ?? null)}</small>
                <small>{underlyingTimestampCaption}</small>
              </dd>
            </div>
            <div>
              <dt>Market Cap</dt>
              <dd>{formatMarketCap(row.marketCapB)}</dd>
            </div>
          </dl>
          <p className="drAssetDataNote">Trading Value and Value are based on the EOD close of {eodReferenceLabel}. DR and underlying markets may close at different times.</p>
        </section>

        <section className="drAssetTimestampLayer" aria-label="Data timestamp context">
          <div className="drAssetTimestampHeader">
            <div>
              <strong>ข้อมูลอัปเดตคนละช่วงเวลา</strong>
              <p>หมายเหตุ: ข้อมูล DR และหุ้นอ้างอิงอาจอ้างอิงวันซื้อขายคนละวัน เนื่องจากเวลาทำการของแต่ละตลาดแตกต่างกัน</p>
            </div>
            {datesDiffer ? <span className="drAssetTimestampWarning">ข้อมูลอาจต่างวันซื้อขาย</span> : null}
          </div>
          <div className="drAssetTimestampGrid">
            {[
              dataTimestampRow("DR Data", drCloseLabel, drDateText),
              dataTimestampRow("Underlying Data", underlyingCloseLabel, underlyingDateText),
              dataTimestampRow("Fundamentals Data", "Latest Update", fundamentalsDateText),
            ].map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.marketLabel}</strong>
                <small>{item.dateText}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="drAssetDecisionStack">
          <article className="drNewTabSection">
            <h2>Quick Insight</h2>
            <ul className="drAssetInsightList">
              <li>{row.ticker} tracks {row.company} ({row.underlying}) through a Thai DR listed on SET.</li>
              <li>{tradingValueTone(row.turnoverM)} · latest trading value {formatTradingValue(row.turnoverM)}.</li>
              <li>{sameUnderlyingRows.length} Thai DR{sameUnderlyingRows.length > 1 ? "s" : ""} currently track {row.underlying}.</li>
              <li>DR move {formatPct(drMove)} vs underlying move {formatPct(underlyingMove)} on latest available EOD data.</li>
              <li>Conversion ratio: {conversionRatioText(row.ratio, row.underlying)}.</li>
            </ul>
            <div className="drAssetInsightStrip">
              <span>{ratingLabel(row)}</span>
              <span>{sameUnderlyingRows.length} Thai DR option{sameUnderlyingRows.length > 1 ? "s" : ""}</span>
              <span>{row.issuer}</span>
              <span>{yesNoIcon((row.turnoverM ?? 0) >= 5)} Liquidity</span>
            </div>
          </article>

          <div className="drAssetDecisionGrid">
            <article className="drNewTabSection">
              <h2>Decision Checklist</h2>
              <div className="drAssetDecisionColumns">
                <section>
                  <h3>Positive</h3>
                  <ul className="drAssetDecisionList">
                    {strengths.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
                <section>
                  <h3>Caution</h3>
                  <ul className="drAssetDecisionList caution">
                    {cautions.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              </div>
            </article>

            <article className="drNewTabSection">
              <h2>Underlying Overview</h2>
              <p>{row.company} อยู่ในกลุ่ม {profile.sector} และธีม {primaryTheme}. สำหรับมุม EOD ตอนนี้ให้ดูทั้งคุณภาพหุ้นแม่, liquidity ฝั่ง DR ไทย, และการมีทางเลือก issuer อื่นใน underlying เดียวกัน.</p>
              <div className="drAssetUnderlyingCards">
                <article><span>Sector</span><strong>{profile.sector}</strong></article>
                <article><span>Industry</span><strong>{profile.industry}</strong></article>
                <article><span>Underlying 1D</span><strong className={(underlyingQuote?.changePct ?? 0) >= 0 ? "positive" : "negative"}>{formatPct(underlyingQuote?.changePct ?? null)}</strong></article>
                <article><span>Data Coverage</span><strong>High</strong></article>
                <article><span>Risk</span><strong>{profile.riskTag}</strong></article>
              </div>
            </article>
          </div>

          <article className="drNewTabSection">
            <h2>Other Thai DRs on {row.underlying}</h2>
            <p>ถ้าหุ้นแม่เดียวกันมีหลาย DR จุดต่างที่ควรดูทันทีคือ issuer, trading value, ratio และสถานะสภาพคล่องของแต่ละตัว.</p>
            {sameUnderlyingRows.length > 1 ? (
              <div className="drNewMiniTable" role="table" aria-label={`${row.underlying} alternatives`}>
                <div className="drNewMiniRow header" role="row">
                  <span>DR</span>
                  <span>Issuer</span>
                  <span>Price</span>
                  <span>Value<br /><small>EOD {eodReferenceLabel}</small></span>
                  <span>Ratio</span>
                  <span>Signal</span>
                  <span>Action</span>
                </div>
                {[...sameUnderlyingRows]
                  .sort((left, right) => (right.turnoverM ?? -1) - (left.turnoverM ?? -1))
                  .map((item) => {
                    const badge = buildRelatedBadge(row.ticker, topLiquidityTicker, item.ticker);
                    return (
                      <div className="drNewMiniRow" role="row" key={item.ticker}>
                        <strong>{item.ticker}</strong>
                        <span>{item.issuer}</span>
                        <span>{formatPriceThb(item.price)}</span>
                        <span>{formatValueCompact(item.turnoverM)}</span>
                        <span>{conversionRatioText(item.ratio, item.underlying)}</span>
                        <span>{badge ? <i className="drAssetInlineBadge">{badge}</i> : item.alert}</span>
                        {item.ticker === row.ticker ? <span>Current</span> : <a href={`/dr-new/${item.ticker}`}>View</a>}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p>No other Thai DR listing for {row.underlying} is currently available.</p>
            )}
          </article>

          <DetailPerformanceChart row={row} chartData={chartData} />

          <div className="drAssetDecisionGrid">
            <article className="drNewTabSection">
              <h2>Dividend</h2>
              <div className="drAssetDividendSummary">
                <div><span>Yield</span><strong>{row.dividendYield === null ? "—" : `${row.dividendYield.toFixed(2)}%`}</strong></div>
                <div><span>Next XD</span><strong>{nextDividendEvent?.xdDate ?? "—"}</strong></div>
                <div><span>Payment</span><strong>{nextDividendEvent?.paymentDate ?? latestDividendEvent?.paymentDate ?? "—"}</strong></div>
                <div><span>Amount</span><strong>{nextDividendEvent?.amountText ?? latestDividendEvent?.amountText ?? "—"}</strong></div>
              </div>
              <p>
                {nextDividendEvent
                  ? `${row.ticker} มี dividend event ล่าสุดสถานะ ${nextDividendEvent.status}${nextDividendEvent.note ? ` · ${nextDividendEvent.note}` : ""}`
                  : row.dividendYield !== null
                    ? `Underlying dividend yield ล่าสุดอยู่ที่ ${row.dividendYield.toFixed(2)}%. Thai DR dividend dates อาจต่างจากตลาดต้นทาง.`
                    : "ยังไม่มี announced Thai DR dividend ใน dataset ปัจจุบัน."}
              </p>
            </article>

            <article className="drNewTabSection">
              <h2>Earnings</h2>
              <div className="drAssetEarningsGrid">
                <div><span>Next Earnings</span><strong>{nextEarnings?.date ?? "—"}</strong><small>{nextEarnings?.earningsTime?.toUpperCase() ?? "Session TBD"}</small></div>
                <div><span>Last Result</span><strong>{latestEarnings?.beatMissLabel ?? (latestEarnings ? "Reported" : "—")}</strong><small>{latestEarnings?.date ?? "No reported row yet"}</small></div>
                <div><span>Most Liquid DR</span><strong>{latestEarnings?.mostLiquidDr ?? topLiquidityTicker ?? row.ticker}</strong><small>{latestEarnings?.mostLiquidDrValueThbM !== null && latestEarnings?.mostLiquidDrValueThbM !== undefined ? `${latestEarnings.mostLiquidDrValueThbM.toFixed(2)}M THB` : "From compare set"}</small></div>
                <div><span>Filing</span><strong>{latestEarnings?.filingConfirmed ? "Verified" : "Unverified"}</strong><small>{latestEarnings?.filingDate ?? "—"}</small></div>
              </div>
              <p>{latestEarnings?.aiSummary ?? latestEarnings?.thaiDrAngle ?? `ติดตาม ${row.underlying} earnings เพื่อดูผลต่อ DR ไทย โดยเฉพาะเมื่อมีหลาย issuer ให้เลือกในตลาดเดียวกัน.`}</p>
            </article>
          </div>

          <DetailReferenceSection
            row={row}
            exchange={exchange}
            profile={profile}
            latestDividendEvent={latestDividendEvent ? {
              amountText: latestDividendEvent.amountText,
              xdDate: latestDividendEvent.xdDate,
              paymentDate: latestDividendEvent.paymentDate,
              status: latestDividendEvent.status,
              sourceUrl: latestDividendEvent.sourceUrl
            } : null}
            latestEarnings={latestEarnings ? {
              date: latestEarnings.date,
              beatMissLabel: latestEarnings.beatMissLabel ?? null,
              aiSummary: latestEarnings.aiSummary ?? null,
              filingConfirmed: latestEarnings.filingConfirmed ?? null,
              filingUrl: latestEarnings.filingUrl ?? null
            } : null}
          />
        </section>
      </main>
    </div>
  );
}
