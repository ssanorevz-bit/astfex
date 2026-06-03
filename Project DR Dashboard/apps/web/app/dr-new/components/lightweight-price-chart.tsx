"use client";

import { useEffect, useMemo, useRef } from "react";
import { createChart, LineSeries, type Time } from "lightweight-charts";
import type { ChartPoint, DetailChartData } from "../data/chart-data";

type ChartMode = "underlying" | "dr" | "compare";
export type ChartRange = "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "All";

type SeriesInput = {
  title: string;
  color: string;
  points: ChartPoint[];
};

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year, month - 1, day));
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function latestDate(points: ChartPoint[]) {
  return points.reduce<string | null>((latest, point) => {
    if (!latest || point.date > latest) return point.date;
    return latest;
  }, null);
}

function cutoffForRange(latest: string, range: ChartRange, allCapYears = false) {
  if (range === "All" && !allCapYears) return null;

  const date = parseDate(latest);
  if (range === "1M") date.setUTCMonth(date.getUTCMonth() - 1);
  if (range === "3M") date.setUTCMonth(date.getUTCMonth() - 3);
  if (range === "6M") date.setUTCMonth(date.getUTCMonth() - 6);
  if (range === "YTD") return `${date.getUTCFullYear()}-01-01`;
  if (range === "1Y") date.setUTCFullYear(date.getUTCFullYear() - 1);
  if (range === "3Y" || (range === "All" && allCapYears)) date.setUTCFullYear(date.getUTCFullYear() - 3);
  return dateString(date);
}

function filterPoints(points: ChartPoint[], cutoff: string | null) {
  if (!cutoff) return points;
  return points.filter((point) => point.date >= cutoff);
}

function rangeCutoff(mode: ChartMode, range: ChartRange, rawSeries: SeriesInput[]) {
  const latest = latestDate(rawSeries.flatMap((item) => item.points));
  if (!latest) return null;
  return cutoffForRange(latest, range, mode === "underlying");
}

function activeSeries(mode: ChartMode, chartData: DetailChartData, ticker: string, underlying: string, range: ChartRange): SeriesInput[] {
  const rawSeries = (() => {
    if (mode === "underlying") {
      return [{
        title: underlying,
        color: "#d28f24",
        points: chartData.underlying.points
      }];
    }
    if (mode === "dr") {
      return [{
        title: ticker,
        color: "#0f6f68",
        points: chartData.dr.points
      }];
    }
    return [
      {
        title: underlying,
        color: "#d28f24",
        points: chartData.compare.underlying
      },
      {
        title: ticker,
        color: "#0f6f68",
        points: chartData.compare.dr
      }
    ];
  })();
  const cutoff = rangeCutoff(mode, range, rawSeries);
  return rawSeries.map((item) => ({
    ...item,
    points: filterPoints(item.points, cutoff)
  }));
}

function hasUsableData(series: SeriesInput[]) {
  return series.some((item) => item.points.length > 0);
}

function toLineData(points: ChartPoint[]) {
  return points.map((point) => ({
    time: point.date as Time,
    value: point.value
  }));
}

export function LightweightPriceChart({
  mode,
  range,
  chartData,
  ticker,
  underlying
}: {
  mode: ChartMode;
  range: ChartRange;
  chartData: DetailChartData;
  ticker: string;
  underlying: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const series = useMemo(() => activeSeries(mode, chartData, ticker, underlying, range), [chartData, mode, range, ticker, underlying]);
  const canRender = hasUsableData(series);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canRender) return;

    const chart = createChart(container, {
      autoSize: true,
      height: 278,
      layout: {
        background: { color: "#fbfdfc" },
        textColor: "#30433f"
      },
      grid: {
        vertLines: { color: "rgba(23, 32, 29, 0.06)" },
        horzLines: { color: "rgba(23, 32, 29, 0.07)" }
      },
      rightPriceScale: {
        borderColor: "rgba(23, 32, 29, 0.12)"
      },
      timeScale: {
        borderColor: "rgba(23, 32, 29, 0.12)",
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        mode: 1
      }
    });

    series.forEach((item) => {
      if (item.points.length < 1) return;
      const lineSeries = chart.addSeries(LineSeries, {
        color: item.color,
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        title: item.title
      });
      lineSeries.setData(toLineData(item.points));
    });

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: entry.contentRect.width, height: 278 });
      chart.timeScale().fitContent();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [canRender, mode, range, series, ticker, underlying]);

  if (!canRender) {
    return (
      <div className="drNewChartEmpty">
        <strong>No EOD chart data available.</strong>
        <span>{mode === "underlying" ? "Underlying price history is missing." : mode === "dr" ? "Thai DR price history is missing." : "Both series need overlapping EOD dates for compare mode."}</span>
      </div>
    );
  }

  return <div ref={containerRef} className="drNewLightweightChart" />;
}
