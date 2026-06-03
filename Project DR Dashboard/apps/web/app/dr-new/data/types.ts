export type NullableNumber = number | null;

export type AssetClass = "Stock" | "ETF" | "Index" | "Commodity" | "Bond" | "Other";
export type ThaiDrAssetType = "Stock DR" | "ETF DR" | "Index DR" | "Commodity DR" | "Bond DR";
export type ThaiDrStatus = "live" | "stale" | "no-feed";

export type DocumentLink = {
  label: "Documents";
  url: string;
};

export type Underlying = {
  symbol: string;
  name: string;
  country: string | null;
  exchange: string | null;
  mic: string | null;
  currency: string | null;
  assetClass: AssetClass;
  sector: string | null;
  industry: string | null;
  themes: string[];
  primaryListingUrl: string | null;
  tradingViewSymbol: string | null;
  yahooSymbol: string | null;
  priceLocal: NullableNumber;
  underlyingChangePct1d: NullableNumber;
  sourceMarketVolume: NullableNumber;
  marketCap: NullableNumber;
  marketCapUsdB: NullableNumber;
  pe: NullableNumber;
  pb: NullableNumber;
  dividendYieldPct: NullableNumber;
  asOfDate: string | null;
};

export type ThaiDr = {
  symbol: string;
  underlyingSymbol: string;
  name: string | null;
  issuerCode: string | null;
  issuerName: string | null;
  issuerWebsite: string | null;
  market: "SET";
  assetType: ThaiDrAssetType;
  tradingCurrency: "THB";
  drPriceThb: NullableNumber;
  drChangePct1d: NullableNumber;
  volume: NullableNumber;
  tradingValueThbM: NullableNumber;
  conversionRatio: string | null;
  officialSetPageUrl: string | null;
  documents: DocumentLink[];
  firstTradeDate: string | null;
  isin: string | null;
  tradingSession: string | null;
  outstandingShare: NullableNumber;
  outstandingDate: string | null;
  status: ThaiDrStatus;
  asOfDate: string | null;
};

export type ThaiDrDividendEvent = {
  id: string;
  source: "Thai DR Dividend";
  drSymbol: string;
  underlyingSymbol: string;
  xdDate: string | null;
  recordDate: string | null;
  paymentDate: string | null;
  amountThb: NullableNumber;
  amountText: string | null;
  currency: "THB";
  dividendType: string | null;
  status: "Upcoming XD" | "Payment Soon" | "Paid" | "Not Announced";
  sourceUrl: string | null;
  note: string | null;
};

export type UnderlyingDividendEvent = {
  id: string;
  source: "Underlying Dividend";
  underlyingSymbol: string;
  exDate: string | null;
  paymentDate: string | null;
  amountLocal: NullableNumber;
  currency: string | null;
  status: "Upcoming" | "Paid" | "Not Announced";
  sourceUrl: string | null;
};

export type CalendarEvent = {
  id: string;
  date: string;
  type: "Dividend XD" | "Dividend Payment" | "Earnings";
  drSymbol: string | null;
  underlyingSymbol: string;
  title: string;
  note: string | null;
  source: "Thai DR Dividend" | "Underlying Earnings";
  sourceUrl: string | null;
};

export type WatchlistItem = {
  id: string;
  drSymbol: string;
  note: string;
  tags: string[];
  updatedAt: string;
  sortOrder: number;
};

export type LegacyDrNewRow = {
  ticker: string;
  underlying: string;
  company: string;
  issuer: string;
  lane: "fast" | "slow";
  region: string;
  theme: string;
  assetType: "Stock DR" | "ETF DR" | "Index DR";
  status: ThaiDrStatus;
  price: NullableNumber;
  changePct: NullableNumber;
  volume: NullableNumber;
  turnoverM: NullableNumber;
  ratio: string;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  marketCapB: number | null;
  score: number;
  alert: string;
  sameUnderlying: string[];
  nextEvent: string;
  officialSetPageUrl?: string | null;
  documents?: DocumentLink[];
  firstTradeDate?: string | null;
  underlyingCurrency?: string | null;
  underlyingPriceLocal?: number | null;
  underlyingChangePct1d?: number | null;
  underlyingOneYearReturnPct?: number | null;
  underlyingYtdReturnPct?: number | null;
};
