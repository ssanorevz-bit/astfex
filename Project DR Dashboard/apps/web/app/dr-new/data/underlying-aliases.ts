export const underlyingSymbolAliases: Record<string, string> = {
  "JEPI ETF": "JEPI",
  "APPL": "APPL",
  "APP": "APPL",
  "BILIBI": "BILIBI"
};

export const reservedUnderlyingAliases: Record<string, string | null> = {
  APPL: "APPL",
  APP: "APPL",
  BILIBI: "BILIBI"
};

export function normalizeUnderlyingSymbol(symbol: string | null | undefined) {
  const value = symbol?.trim() ?? "";
  return underlyingSymbolAliases[value] ?? value;
}

export function hasUnderlyingAlias(symbol: string | null | undefined) {
  const value = symbol?.trim() ?? "";
  return value !== normalizeUnderlyingSymbol(value);
}
