import { CompareWorkspace } from "../components/compare-workspace";
import { getScreenerRows } from "../data";
import { DrNewShell } from "../components/dr-new-shell";

export const metadata = {
  title: "Thai DR Compare",
  description: "Compare Thai DRs by same underlying or investment theme"
};

export default function DrNewComparePage() {
  return (
    <DrNewShell
      active="compare"
      title="Compare DRs"
      subtitle="Compare Thai DRs by same underlying or investment theme."
    >
      <CompareWorkspace rows={getScreenerRows()} />
    </DrNewShell>
  );
}
