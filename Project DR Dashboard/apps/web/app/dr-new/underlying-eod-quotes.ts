import type { DrNewRow } from "./mock-dr-new-data";

export type UnderlyingEodQuote = {
  price: number;
  currency: "USD" | "HKD" | "CNY" | "JPY" | "VND" | "SGD" | "DKK";
  change: number;
  changePct: number;
  ytdReturnPct: number;
  oneYearReturnPct: number;
};

export function getUnderlyingEodQuote(row: DrNewRow) {
  if (row.underlyingPriceLocal !== undefined && row.underlyingPriceLocal !== null) {
    const price = row.underlyingPriceLocal;
    const changePct = row.underlyingChangePct1d ?? 0;
    return {
      price,
      currency: (row.underlyingCurrency ?? "USD") as UnderlyingEodQuote["currency"],
      change: price * changePct / 100,
      changePct,
      ytdReturnPct: row.underlyingYtdReturnPct ?? changePct,
      oneYearReturnPct: row.underlyingOneYearReturnPct ?? changePct
    };
  }
  return null;
}

export function formatUnderlyingPrice(quote: UnderlyingEodQuote | null) {
  if (!quote) return "—";
  if (quote.currency === "USD") return `$${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "HKD") return `HK$${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "CNY") return `CN¥${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "JPY") return `¥${quote.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (quote.currency === "SGD") return `S$${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (quote.currency === "DKK") return `DKK ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `VND ${quote.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
