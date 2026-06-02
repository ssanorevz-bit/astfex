import { DrNewShell } from "../components/dr-new-shell";
import { WatchlistWorkspace } from "../components/watchlist-workspace";

export const metadata = {
  title: "Thai DR Watchlist",
  description: "Track saved Thai DRs and underlying stocks after the latest EOD update"
};

export default function DrNewWatchlistPage() {
  return (
    <DrNewShell
      active="watchlist"
      title="Watchlist"
      subtitle="Track your saved Thai DRs and underlying stocks after the latest EOD update."
    >
      <WatchlistWorkspace />
    </DrNewShell>
  );
}
