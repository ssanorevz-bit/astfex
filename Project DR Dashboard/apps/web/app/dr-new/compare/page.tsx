import { CompareWorkspace } from "../components/compare-workspace";
import { getScreenerRows } from "../data";
import { DrNewShell } from "../components/dr-new-shell";

export const metadata = {
  title: "Thai DR Compare",
  description: "Compare Thai DRs by same underlying or investment theme"
};

function firstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function DrNewComparePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialRequest =
    firstQueryValue(resolvedSearchParams?.underlying) ??
    firstQueryValue(resolvedSearchParams?.ticker);

  return (
    <DrNewShell
      active="compare"
      title="Compare DRs"
      subtitle="Compare Thai DRs by same underlying or investment theme."
    >
      <CompareWorkspace rows={getScreenerRows()} initialRequest={initialRequest} />
    </DrNewShell>
  );
}
