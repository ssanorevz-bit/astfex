import { DrNewShell } from "../components/dr-new-shell";
import { RankingsWorkspace } from "../components/rankings-workspace";

export const metadata = {
  title: "Thai DR Rankings",
  description: "Discover Thai DRs by size, momentum, dividends, trading activity, and themes"
};

export default function DrNewRankingsPage() {
  return (
    <DrNewShell
      active="rankings"
      title="DR Rankings"
      subtitle="Discover Thai DRs by size, momentum, dividends, trading activity, and themes."
    >
      <RankingsWorkspace />
    </DrNewShell>
  );
}
