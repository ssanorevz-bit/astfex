"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getDrNewProfile } from "../dr-new-derived";
import { getTaxonomyAssetType, getTaxonomyCountry, getTaxonomyPrimaryTheme, getTaxonomyThemes } from "../dr-taxonomy";
import type { DrNewRow } from "../mock-dr-new-data";
import { getUnderlyingEodQuote } from "../underlying-eod-quotes";

type RankingCategory = "popular" | "marketCap" | "performance" | "dividend" | "tradingActivity" | "themes";

type RankingConfig = {
  id: RankingCategory;
  label: string;
  title: string;
  description: string;
  metricLabel: string;
  rows: DrNewRow[];
  metric: (row: DrNewRow) => string;
};

const categories: Array<{ id: RankingCategory; label: string }> = [
  { id: "popular", label: "Popular" },
  { id: "marketCap", label: "Market Cap" },
  { id: "performance", label: "Performance" },
  { id: "dividend", label: "Dividend" },
  { id: "tradingActivity", label: "Trading Activity" },
  { id: "themes", label: "Themes" }
];

const safeMarketCapUsdBCeiling = 10_000;

function formatPct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMarketCap(value: number | null) {
  if (value === null) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 2000 ? 1 : 2)}T`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}B`;
}

function formatTradingValue(value: number | null) {
  if (value === null) return "—";
  if (value >= 1) return `THB ${value.toFixed(2)}M`;
  return `THB ${(value * 1000).toFixed(0)}K`;
}

function sortNumber(value: number | null) {
  return value ?? Number.NEGATIVE_INFINITY;
}

function matchesSearch(row: DrNewRow, query: string) {
  const text = `${row.ticker} ${row.underlying} ${row.company} ${row.issuer} ${row.region} ${row.theme} ${getTaxonomyCountry(row)} ${getTaxonomyThemes(row).join(" ")}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

function rankByMarketCap(rows: DrNewRow[]) {
  return [...rows]
    .filter((row) => row.marketCapB !== null && row.marketCapB <= safeMarketCapUsdBCeiling)
    .sort((left, right) => (right.marketCapB ?? -1) - (left.marketCapB ?? -1));
}

function rankByUnderlying1d(rows: DrNewRow[]) {
  return [...rows].sort((left, right) => sortNumber(getUnderlyingEodQuote(right)?.changePct ?? null) - sortNumber(getUnderlyingEodQuote(left)?.changePct ?? null));
}

function rankByDr1d(rows: DrNewRow[]) {
  return [...rows].sort((left, right) => sortNumber(right.changePct) - sortNumber(left.changePct));
}

function rankByDr1dLosers(rows: DrNewRow[]) {
  return [...rows].sort((left, right) => sortNumber(left.changePct) - sortNumber(right.changePct));
}

function rankByDividend(rows: DrNewRow[]) {
  return [...rows].sort((left, right) => (right.dividendYield ?? -1) - (left.dividendYield ?? -1));
}

function rankByTradingValue(rows: DrNewRow[]) {
  return [...rows].sort((left, right) => sortNumber(right.turnoverM) - sortNumber(left.turnoverM));
}

function rankByPopular(rows: DrNewRow[]) {
  return [...rows].sort((left, right) => {
    const rightValue = right.score * 100 + (right.turnoverM ?? 0) * 15 + (right.volume ?? 0) / 10000;
    const leftValue = left.score * 100 + (left.turnoverM ?? 0) * 15 + (left.volume ?? 0) / 10000;
    return rightValue - leftValue;
  });
}

function buildRankingConfig(active: RankingCategory, rows: DrNewRow[]): RankingConfig {
  const stockRows = rows.filter((row) => getTaxonomyAssetType(row) === "Stock");
  const configs: Record<RankingCategory, RankingConfig> = {
    popular: {
      id: "popular",
      label: "Popular",
      title: "Most Watched Thai DRs",
      description: "DRs with strong interest signals from score, trading value, and recent activity.",
      metricLabel: "Interest",
      rows: rankByPopular(rows),
      metric: (row) => `${row.score} score`
    },
    marketCap: {
      id: "marketCap",
      label: "Market Cap",
      title: "Largest Underlying Market Cap",
      description: "หุ้นแม่ขนาดใหญ่ที่สุดที่มี DR ในไทย โดยใช้ market cap ของ underlying ไม่ใช่มูลค่าของ DR.",
      metricLabel: "Market Cap",
      rows: rankByMarketCap(stockRows),
      metric: (row) => formatMarketCap(row.marketCapB)
    },
    performance: {
      id: "performance",
      label: "Performance",
      title: "Top Underlying 1D Return",
      description: "อันดับผลตอบแทน EOD ล่าสุดของหุ้นแม่ แยกจากผลตอบแทนของ DR เพื่อไม่ให้ข้อมูลปนกัน.",
      metricLabel: "Underlying 1D",
      rows: rankByUnderlying1d(rows),
      metric: (row) => formatPct(getUnderlyingEodQuote(row)?.changePct ?? null)
    },
    dividend: {
      id: "dividend",
      label: "Dividend",
      title: "High Dividend Yield",
      description: "DRs and ETFs with stronger income profile, linked conceptually to the Dividend Center workflow.",
      metricLabel: "Dividend Yield",
      rows: rankByDividend(rows),
      metric: (row) => row.dividendYield === null ? "—" : `${row.dividendYield.toFixed(1)}%`
    },
    tradingActivity: {
      id: "tradingActivity",
      label: "Trading Activity",
      title: "Highest Trading Value",
      description: "DRs ranked by Thai DR trading value, useful when comparing activity between wrappers.",
      metricLabel: "Trading Value",
      rows: rankByTradingValue(rows),
      metric: (row) => formatTradingValue(row.turnoverM)
    },
    themes: {
      id: "themes",
      label: "Themes",
      title: "AI & Semiconductor Leaders",
      description: "Theme-first ideas for users who browse by story before selecting a specific DR.",
      metricLabel: "Theme",
      rows: rankByMarketCap(rows.filter((row) => getTaxonomyThemes(row).some((theme) => ["AI & Semiconductor", "Cloud & Software", "Mega Cap Tech", "EV & Battery"].includes(theme)))),
      metric: (row) => getTaxonomyPrimaryTheme(row)
    }
  };

  return configs[active];
}

function buildCollectionCards(rows: DrNewRow[]): Array<{
  title: string;
  description: string;
  rows: DrNewRow[];
  metric: (row: DrNewRow) => string;
  href?: string;
}> {
  return [
  {
    title: "Largest Underlying Market Cap",
    description: "Parent stocks with the largest market value.",
    rows: rankByMarketCap(rows.filter((row) => getTaxonomyAssetType(row) === "Stock")),
    metric: (row: DrNewRow) => formatMarketCap(row.marketCapB)
  },
  {
    title: "Top DR Gainers 1D",
    description: "Thai DR price movers after the latest EOD update.",
    rows: rankByDr1d(rows),
    metric: (row: DrNewRow) => formatPct(row.changePct)
  },
  {
    title: "Top DR Losers 1D",
    description: "Thai DR decliners after the latest EOD update.",
    rows: rankByDr1dLosers(rows),
    metric: (row: DrNewRow) => formatPct(row.changePct)
  },
  {
    title: "Highest Dividend Yield",
    description: "Income candidates.",
    rows: rankByDividend(rows),
    metric: (row: DrNewRow) => row.dividendYield === null ? "—" : `${row.dividendYield.toFixed(1)}% DY`,
    href: "/dr-new/dividends"
  },
  {
    title: "Most Active DRs",
    description: "Thai trading value leaders.",
    rows: rankByTradingValue(rows),
    metric: (row: DrNewRow) => formatTradingValue(row.turnoverM)
  },
  {
    title: "AI Leaders",
    description: "AI and software themes.",
    rows: rankByMarketCap(rows.filter((row) => getTaxonomyThemes(row).includes("AI & Semiconductor") || getTaxonomyThemes(row).includes("Cloud & Software"))),
    metric: (row: DrNewRow) => getTaxonomyPrimaryTheme(row),
    href: "/dr-new/compare"
  },
  {
    title: "China Tech",
    description: "Hong Kong and China internet.",
    rows: rankByMarketCap(rows.filter((row) => getTaxonomyThemes(row).includes("China Tech"))),
    metric: (row: DrNewRow) => getTaxonomyCountry(row),
    href: "/dr-new/compare"
  },
  {
    title: "Bond & Income",
    description: "Dividend and index wrappers.",
    rows: rankByDividend(rows.filter((row) => getTaxonomyThemes(row).includes("Bond & Income") || getTaxonomyAssetType(row) === "ETF")),
    metric: (row: DrNewRow) => row.dividendYield === null ? "—" : `${row.dividendYield.toFixed(1)}% DY`,
    href: "/dr-new/compare"
  },
  {
    title: "Upcoming XD",
    description: "Dividend workflow shortcut.",
    rows: rankByDividend(rows.filter((row) => /Dividend|distribution|XD/i.test(`${row.alert} ${row.nextEvent}`))),
    metric: (row: DrNewRow) => row.nextEvent,
    href: "/dr-new/dividends"
  },
  {
    title: "Semiconductor",
    description: "Chip and AI infrastructure.",
    rows: rankByMarketCap(rows.filter((row) => getTaxonomyThemes(row).includes("AI & Semiconductor"))),
    metric: (row: DrNewRow) => formatMarketCap(row.marketCapB),
    href: "/dr-new/compare"
  }
  ];
}

export function RankingsWorkspace({ rows }: { rows: DrNewRow[] }) {
  const [active, setActive] = useState<RankingCategory>("marketCap");
  const [query, setQuery] = useState("");
  const config = useMemo(() => buildRankingConfig(active, rows), [active, rows]);
  const collectionCards = useMemo(() => buildCollectionCards(rows), [rows]);
  const featuredRows = config.rows.filter((row) => matchesSearch(row, query)).slice(0, 8);

  return (
    <div className="drRankingHub">
      <div className="drRankingIntro">
        <div>
          <span className="drRankingBadge">EOD Data · Updated after market close</span>
          <h2>Discover Thai DRs by category</h2>
          <p>Browse Thai DRs by underlying size, performance, dividends, trading activity, and investment themes.</p>
        </div>
        <label className="drRankingSearch">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="NVDA80, Nvidia, Semiconductor"
          />
        </label>
      </div>

      <div className="drRankingCategories" aria-label="Ranking categories">
        {categories.map((category) => (
          <button
            className={category.id === active ? "active" : ""}
            key={category.id}
            onClick={() => setActive(category.id)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>

      <section className="drRankingFeatured">
        <div className="drRankingFeaturedHead">
          <div>
            <span className="drNewKicker">Featured Ranking</span>
            <h2>{config.title}</h2>
            <p>{config.description}</p>
          </div>
          <strong>{config.metricLabel}</strong>
        </div>

        <div className="drRankingRows">
          {featuredRows.length === 0 ? (
            <div className="drRankingEmpty">No Thai DRs matched this ranking search.</div>
          ) : null}
          {featuredRows.map((row, index) => {
            const profile = getDrNewProfile(row);
            return (
              <Link className="drRankingRow" href={`/dr-new/${row.ticker}`} key={row.ticker}>
                <span className="drRankingRank">#{index + 1}</span>
                <span className="drRankingIdentity">
                  <strong>{row.ticker}</strong>
                  <small className="drNameClamp" title={row.company}>{row.company}</small>
                  <em>{row.underlying} · {getTaxonomyCountry(row)} · {profile.sector}</em>
                </span>
                <span className="drRankingMetric">
                  <strong>{config.metric(row)}</strong>
                  <small>{config.metricLabel}</small>
                </span>
                <span className="drRankingAction">View</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="drRankingCollections">
        <div className="drRankingSectionHead">
          <span className="drNewKicker">Explore More Rankings</span>
          <h2>Quick ranking collections</h2>
        </div>
        <div className="drRankingCardGrid">
          {collectionCards.map((card) => {
            const topRow = card.rows[0];
            if (!topRow) return null;
            return (
              <Link className="drRankingCard" href={card.href ?? `/dr-new/${topRow.ticker}`} key={card.title}>
                <span>{card.title}</span>
                <p>{card.description}</p>
                <strong>{topRow.ticker}</strong>
                <small className="drNameClampTwo" title={topRow.company}>{topRow.company}</small>
                <em>{card.metric(topRow)}</em>
                <b>{card.href ? "Explore" : "View"}</b>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
