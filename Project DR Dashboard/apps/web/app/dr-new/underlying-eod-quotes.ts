import type { DrNewRow } from "./mock-dr-new-data";

export type UnderlyingEodQuote = {
  price: number;
  currency: "USD" | "HKD" | "CNY" | "JPY" | "VND" | "SGD" | "DKK";
  change: number;
  changePct: number;
  ytdReturnPct: number;
  oneYearReturnPct: number;
};

const underlyingEodQuotes: Record<string, UnderlyingEodQuote> = {
  NVDA: { price: 142.15, currency: "USD", change: 0.98, changePct: 0.69, ytdReturnPct: 12.4, oneYearReturnPct: 168.2 },
  TSLA: { price: 346.22, currency: "USD", change: 0, changePct: 0, ytdReturnPct: -8.6, oneYearReturnPct: 34.1 },
  AMD: { price: 118.74, currency: "USD", change: -0.73, changePct: -0.61, ytdReturnPct: -2.8, oneYearReturnPct: 22.7 },
  BABA: { price: 88.23, currency: "USD", change: 1.28, changePct: 1.47, ytdReturnPct: 3.9, oneYearReturnPct: 18.4 },
  BIDU: { price: 91.64, currency: "USD", change: 0.87, changePct: 0.96, ytdReturnPct: -6.2, oneYearReturnPct: -11.5 },
  TCEHY: { price: 52.48, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 15.8, oneYearReturnPct: 37.9 },
  "1024": { price: 55.10, currency: "HKD", change: 0, changePct: 0, ytdReturnPct: 18.1, oneYearReturnPct: 42.3 },
  LLY: { price: 762.40, currency: "USD", change: 4.34, changePct: 0.57, ytdReturnPct: -1.7, oneYearReturnPct: -9.8 },
  MU: { price: 124.82, currency: "USD", change: 0.60, changePct: 0.48, ytdReturnPct: 24.6, oneYearReturnPct: 58.1 },
  AVGO: { price: 301.74, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 16.9, oneYearReturnPct: 92.4 },
  AMZN: { price: 182.30, currency: "USD", change: 0, changePct: 0, ytdReturnPct: -6.1, oneYearReturnPct: -0.8 },
  MSFT: { price: 492.34, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 19.2, oneYearReturnPct: 28.5 },
  META: { price: 650.08, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 11.7, oneYearReturnPct: 41.2 },
  GOOG: { price: 178.42, currency: "USD", change: 0.46, changePct: 0.26, ytdReturnPct: -5.4, oneYearReturnPct: 2.1 },
  NFLX: { price: 1184.52, currency: "USD", change: -5.73, changePct: -0.48, ytdReturnPct: 33.5, oneYearReturnPct: 78.4 },
  IONQ: { price: 39.22, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 14.9, oneYearReturnPct: 126.8 },
  RKLB: { price: 27.84, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 31.8, oneYearReturnPct: 203.6 },
  PLTR: { price: 125.15, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 54.2, oneYearReturnPct: 312.4 },
  "1810": { price: 43.80, currency: "HKD", change: -0.36, changePct: -0.82, ytdReturnPct: 25.7, oneYearReturnPct: 86.3 },
  "300750": { price: 246.10, currency: "CNY", change: 0, changePct: 0, ytdReturnPct: 7.8, oneYearReturnPct: 14.6 },
  "2318": { price: 47.20, currency: "HKD", change: 0, changePct: 0, ytdReturnPct: 10.4, oneYearReturnPct: 23.8 },
  SPY: { price: 596.90, currency: "USD", change: 0.95, changePct: 0.16, ytdReturnPct: 8.3, oneYearReturnPct: 14.8 },
  QQQ: { price: 529.44, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 9.7, oneYearReturnPct: 19.5 },
  JEPI: { price: 56.18, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 4.1, oneYearReturnPct: 8.6 },
  NVO: { price: 438.80, currency: "DKK", change: 0, changePct: 0, ytdReturnPct: -12.5, oneYearReturnPct: -33.7 },
  V: { price: 365.15, currency: "USD", change: 0.66, changePct: 0.18, ytdReturnPct: 15.3, oneYearReturnPct: 28.9 },
  MA: { price: 571.24, currency: "USD", change: -1.14, changePct: -0.20, ytdReturnPct: 8.8, oneYearReturnPct: 21.4 },
  "1211": { price: 388.40, currency: "HKD", change: 0, changePct: 0, ytdReturnPct: 42.6, oneYearReturnPct: 65.2 },
  "6501": { price: 4240, currency: "JPY", change: 0, changePct: 0, ytdReturnPct: 9.1, oneYearReturnPct: 36.5 },
  FPT: { price: 118500, currency: "VND", change: 1000, changePct: 0.84, ytdReturnPct: 7.4, oneYearReturnPct: 19.8 },
  VCB: { price: 62000, currency: "VND", change: 260, changePct: 0.42, ytdReturnPct: 5.8, oneYearReturnPct: 12.9 },
  VNM: { price: 67200, currency: "VND", change: 140, changePct: 0.21, ytdReturnPct: -3.1, oneYearReturnPct: 4.4 },
  VN30: { price: 1518.20, currency: "VND", change: 5.46, changePct: 0.36, ytdReturnPct: 6.7, oneYearReturnPct: 16.2 },
  D05: { price: 45.86, currency: "SGD", change: 0.24, changePct: 0.52, ytdReturnPct: 12.1, oneYearReturnPct: 27.6 },
  USO: { price: 78.22, currency: "USD", change: -0.95, changePct: -1.20, ytdReturnPct: 3.5, oneYearReturnPct: -6.9 },
  RGTI: { price: 10.52, currency: "USD", change: 0, changePct: 0, ytdReturnPct: 21.9, oneYearReturnPct: 178.3 }
};

export function getUnderlyingEodQuote(row: DrNewRow) {
  return underlyingEodQuotes[row.underlying] ?? {
    price: row.price,
    currency: row.region === "Japan" ? "JPY" : row.region === "Vietnam" ? "VND" : "USD",
    change: 0,
    changePct: row.changePct,
    ytdReturnPct: row.changePct,
    oneYearReturnPct: row.changePct
  };
}

export function formatUnderlyingPrice(quote: UnderlyingEodQuote) {
  if (quote.currency === "USD") return `$${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "HKD") return `HK$${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "CNY") return `CN¥${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "JPY") return `¥${quote.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (quote.currency === "SGD") return `S$${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "DKK") return `DKK ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `VND ${quote.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
