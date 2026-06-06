import drPriceHistorySource from "../../../../../KB/dr_price_history.json";
import { getPreferredUnderlyingHistory } from "./underlying-price-history";
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

type DrPriceHistoryRecord = {
  prices?: Array<{
    date?: string;
    close?: number | string | null;
  }>;
};

const drPriceHistoryMap = drPriceHistorySource as Record<string, DrPriceHistoryRecord | undefined>;

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
  const record = getPreferredUnderlyingHistory(symbol);
  const points = normalizeSeries((record?.prices ?? []).flatMap((item) => {
    const value = toNumber(item.close);
    return item.date && value !== null ? [{ date: item.date, value }] : [];
  }));

  return {
    currency: record?.currency ?? null,
    points
  };
}

function getDrHistory(symbol: string) {
  const record = drPriceHistoryMap[symbol.toUpperCase()];
  return normalizeSeries((record?.prices ?? []).flatMap((item) => {
    const value = toNumber(item.close);
    return item.date && value !== null ? [{ date: item.date, value }] : [];
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
