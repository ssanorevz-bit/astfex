import type { DrNewRow } from "./mock-dr-new-data";

export type DrNewProfile = {
  sector: string;
  industry: string;
  revenueGrowth5y: number | null;
  netMargin: number | null;
  grossMargin: number | null;
  roe: number | null;
  underlyingQuality: number;
  drStructure: number;
  tradingActivity: number;
  dataQuality: number;
  riskTag: string;
  eodChange30d: number;
  eodChange12m: number;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function sectorFromTheme(row: DrNewRow) {
  if (row.assetType !== "Stock DR") return { sector: "ETF", industry: row.theme };
  if (row.theme.includes("Semiconductor")) return { sector: "Technology", industry: "Semiconductors" };
  if (row.theme.includes("Software")) return { sector: "Technology", industry: "Software" };
  if (row.theme.includes("Consumer Tech")) return { sector: "Communication Services", industry: "Internet Platforms" };
  if (row.theme.includes("China Internet")) return { sector: "Communication Services", industry: "China Internet" };
  if (row.theme.includes("EV")) return { sector: "Consumer Cyclical", industry: "EV / Battery" };
  if (row.theme.includes("Healthcare")) return { sector: "Healthcare", industry: "Pharma / Devices" };
  if (row.theme.includes("Financials")) return { sector: "Financials", industry: "Payments / Banks" };
  if (row.theme.includes("Energy")) return { sector: "Energy", industry: "Commodity ETF" };
  return { sector: "Industrials", industry: row.theme };
}

export function getDrNewProfile(row: DrNewRow): DrNewProfile {
  const { sector, industry } = sectorFromTheme(row);
  const growthBase = row.theme.includes("AI") ? 24 : row.theme.includes("EV") ? 18 : row.theme.includes("Income") ? 5 : 11;
  const marginBase = row.theme.includes("Software") ? 32 : row.theme.includes("Semiconductor") ? 27 : row.theme.includes("Financials") ? 28 : 16;
  const tradingValue = row.turnoverM ?? 0;
  const changePct = row.changePct ?? 0;
  const tradingActivity = row.turnoverM === null ? 0 : clamp(Math.round(42 + tradingValue * 28));
  const drStructure = clamp(Math.round(52 + tradingValue * 22 + (row.status === "live" ? 12 : row.status === "stale" ? 4 : -12)));
  const dataQuality = row.status === "live" ? 92 : row.status === "stale" ? 66 : 34;
  const underlyingQuality = clamp(Math.round(row.score + (row.pe && row.pe < 35 ? 4 : -2) + (row.dividendYield ? 1 : 0)));

  return {
    sector,
    industry,
    revenueGrowth5y: row.assetType === "ETF DR" ? null : growthBase + (row.score % 7),
    netMargin: row.assetType === "ETF DR" ? null : marginBase + (row.score % 5),
    grossMargin: row.assetType === "ETF DR" ? null : marginBase + 22 + (row.score % 6),
    roe: row.assetType === "ETF DR" ? null : clamp(8 + (row.score % 24), 0, 48),
    underlyingQuality,
    drStructure,
    tradingActivity,
    dataQuality,
    riskTag: tradingValue < 0.05 ? "Low Trading Activity" : row.pe && row.pe > 80 ? "High multiple" : "Normal",
    eodChange30d: Number((changePct * 4 + (row.score % 9) - 4).toFixed(2)),
    eodChange12m: Number((changePct * 9 + row.score / 2 - 22).toFixed(2))
  };
}

export function formatNumber(value: number | null, suffix = "") {
  if (value === null) return "—";
  return `${value.toFixed(1)}${suffix}`;
}
