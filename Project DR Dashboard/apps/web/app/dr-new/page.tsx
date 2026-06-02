import { DrNewShell } from "./components/dr-new-shell";
import { ScreenerWorkspace } from "./components/screener-workspace";
import { drNewRows } from "./mock-dr-new-data";

export const metadata = {
  title: "Thai DR Screener",
  description: "DR Screener for parent stocks with Thai DR availability"
};

export default function DrNewPage() {
  return (
    <DrNewShell
      active="dashboard"
      title="DR Screener"
      subtitle="Start from the parent stock, then open the Thai DR choices available for that underlying."
    >
      <ScreenerWorkspace rows={drNewRows} />
    </DrNewShell>
  );
}
