import { DividendCenterWorkspace } from "../components/dividend-center-workspace";
import { DrNewShell } from "../components/dr-new-shell";
import { drNewRows } from "../mock-dr-new-data";

export const metadata = {
  title: "Thai DR Dividend Center",
  description: "Dividend Center for Thai DRs and their underlying assets"
};

export default function DrNewDividendsPage() {
  return (
    <DrNewShell
      active="dividends"
      title="Dividend Center"
      subtitle="Track dividend information for Thai DRs and their underlying assets."
    >
      <DividendCenterWorkspace rows={drNewRows} />
    </DrNewShell>
  );
}
