import { CalendarWorkspace } from "../components/calendar-workspace";
import { getCalendarEvents } from "../data";
import { DrNewShell } from "../components/dr-new-shell";

export const metadata = {
  title: "Thai DR Calendar",
  description: "EOD event calendar for Thai DR dividends, earnings, listings, and market events"
};

export default function DrNewCalendarPage() {
  return (
    <DrNewShell
      active="calendar"
      title="Calendar"
      subtitle="Track DR and underlying events across dividends, earnings, listings, market holidays, and source-market updates."
    >
      <CalendarWorkspace events={getCalendarEvents()} />
    </DrNewShell>
  );
}
