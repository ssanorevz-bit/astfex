import fs from "node:fs";
import path from "node:path";
import underlyingPriceSource from "../../../../../KB/underlying_price_history.json";
import { normalizeUnderlyingSymbol } from "./underlying-aliases";
import type { LegacyDrNewRow } from "./types";

export type ChartPoint = {
  date: string;
  value: number;
};

export type DetailChartData = {
  underlying: {
    currency: string | null;
    points: ChartPoint[];
  };
  dr: {
    currency: "THB";
    points: ChartPoint[];
  };
  compare: {
    underlying: ChartPoint[];
    dr: ChartPoint[];
  };
};

type UnderlyingPriceRecord = {
  currency?: string;
  prices?: Array<{
    date?: string;
    close?: string;
  }>;
};

const underlyingPriceMap = underlyingPriceSource as Record<string, UnderlyingPriceRecord | undefined>;

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "nan") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSeries(points: ChartPoint[]) {
  return points
    .filter((point) => point.date && Number.isFinite(point.value))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function getUnderlyingHistory(symbol: string) {
  const normalized = normalizeUnderlyingSymbol(symbol);
  const record = underlyingPriceMap[normalized];
  const points = normalizeSeries((record?.prices ?? []).flatMap((item) => {
    const value = toNumber(item.close);
    return item.date && value !== null ? [{ date: item.date, value }] : [];
  }));

  return {
    currency: record?.currency ?? null,
    points
  };
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function getDrHistory(symbol: string) {
  const filePath = path.join(process.cwd(), "../../dr_database/price", `${symbol.toUpperCase()}_price.csv`);
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0].replace(/^\uFEFF/, ""));
  const dateIndex = headers.indexOf("date");
  const closeIndex = headers.indexOf("close");
  if (dateIndex < 0 || closeIndex < 0) return [];

  return normalizeSeries(lines.slice(1).flatMap((line) => {
    const cells = parseCsvLine(line);
    const value = toNumber(cells[closeIndex]);
    const date = cells[dateIndex];
    return date && value !== null ? [{ date, value }] : [];
  }));
}

function rebase(points: ChartPoint[]) {
  const base = points[0]?.value;
  if (!base) return [];
  return points.map((point) => ({
    date: point.date,
    value: point.value / base * 100
  }));
}

function buildCompareSeries(underlyingPoints: ChartPoint[], drPoints: ChartPoint[]) {
  const drByDate = new Map(drPoints.map((point) => [point.date, point.value]));
  const shared = underlyingPoints.flatMap((point) => {
    const drValue = drByDate.get(point.date);
    return drValue === undefined ? [] : [{ date: point.date, underlyingValue: point.value, drValue }];
  });

  return {
    underlying: rebase(shared.map((point) => ({ date: point.date, value: point.underlyingValue }))),
    dr: rebase(shared.map((point) => ({ date: point.date, value: point.drValue })))
  };
}

export function getSingleDrChartData(row: LegacyDrNewRow): DetailChartData {
  const underlying = getUnderlyingHistory(row.underlying);
  const drPoints = getDrHistory(row.ticker);
  const compare = buildCompareSeries(underlying.points, drPoints);

  return {
    underlying,
    dr: {
      currency: "THB",
      points: drPoints
    },
    compare
  };
}
