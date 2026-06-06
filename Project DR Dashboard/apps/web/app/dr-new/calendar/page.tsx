import { CalendarWorkspace } from "../components/calendar-workspace";
import { getCalendarEvents } from "../data";
import { DrNewShell } from "../components/dr-new-shell";

export const metadata = {
  title: "Thai DR Calendar",
  description: "EOD event calendar for Thai DR dividends and underlying earnings"
};

export default function DrNewCalendarPage() {
  return (
    <DrNewShell
      active="calendar"
      title="Calendar"
      subtitle="Track Thai DR dividend dates and underlying earnings catalysts after the latest market close."
    >
      <CalendarWorkspace events={getCalendarEvents()} />
    </DrNewShell>
  );
}
