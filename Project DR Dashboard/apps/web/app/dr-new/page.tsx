import { DrNewShell } from "./components/dr-new-shell";
import { ScreenerWorkspace } from "./components/screener-workspace";
import { getScreenerRows } from "./data";

export const metadata = {
  title: "Thai DR Screener",
  description: "DR Screener for parent stocks with Thai DR availability"
};

function firstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DrNewPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <DrNewShell
      active="dashboard"
      title="DR Screener"
      subtitle="Screen Thai DR tickers by country, theme, asset type, liquidity, valuation, and dividend profile."
    >
      <ScreenerWorkspace
        rows={getScreenerRows()}
        initialFilters={{
          country: firstQueryValue(resolvedSearchParams?.country),
          theme: firstQueryValue(resolvedSearchParams?.theme),
          assetType: firstQueryValue(resolvedSearchParams?.asset),
          query: firstQueryValue(resolvedSearchParams?.q),
          sort: firstQueryValue(resolvedSearchParams?.sort)
        }}
      />
    </DrNewShell>
  );
}
