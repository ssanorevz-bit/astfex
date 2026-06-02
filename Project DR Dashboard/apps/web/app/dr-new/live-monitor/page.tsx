import { DrNewShell } from "../components/dr-new-shell";
import { drNewMonitor, drNewRows } from "../mock-dr-new-data";

export const metadata = {
  title: "DR Ops Backlog Sandbox"
};

export default function DrNewLiveMonitorPage() {
  const statusRows = [
    { label: "Complete", value: drNewMonitor.connected, tone: "live" },
    { label: "Needs review", value: drNewMonitor.stale, tone: "stale" },
    { label: "Missing", value: drNewMonitor.missing, tone: "no-feed" }
  ];
  const completeRows = drNewRows.filter((row) => row.status === "live").slice(0, 10);

  return (
    <DrNewShell
      active="monitor"
      title="Ops Backlog"
      subtitle="A parked mock operational page for future runtime confidence. The EOD screener remains the product focus until live work resumes."
    >
      <section className="drNewMonitorGrid">
        <article className="drNewMonitorHero">
          <span>Universe coverage</span>
          <strong>{drNewMonitor.connected}/{drNewMonitor.universe}</strong>
          <p>Mock EOD source state · batch timestamp {drNewMonitor.lastUpdate}</p>
        </article>
        {statusRows.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p><i className={`drNewDot ${item.tone}`} /> {item.tone}</p>
          </article>
        ))}
      </section>

      <section className="drNewLaneHealth">
        <article>
          <div>
            <p className="drNewKicker">Core coverage</p>
            <h2>High-priority EOD set</h2>
          </div>
          <strong>{drNewMonitor.fastLane.connected}/{drNewMonitor.fastLane.total}</strong>
          <p>{drNewMonitor.fastLane.stale} stale · {drNewMonitor.fastLane.missing} missing</p>
        </article>
        <article>
          <div>
            <p className="drNewKicker">Extended coverage</p>
            <h2>Full EOD universe</h2>
          </div>
          <strong>{drNewMonitor.slowLane.connected}/{drNewMonitor.slowLane.total}</strong>
          <p>{drNewMonitor.slowLane.stale} stale · {drNewMonitor.slowLane.missing} missing</p>
        </article>
      </section>

      <section className="drNewPanel">
        <div className="drNewPanelHead">
          <p className="drNewKicker">Data quality table</p>
          <h2>Complete mock rows</h2>
        </div>
        <div className="drNewFreshnessList">
          {completeRows.map((row) => (
            <div key={row.ticker}>
              <strong>{row.ticker}</strong>
              <span>{row.lane === "fast" ? "core" : "extended"}</span>
              <span>{row.status === "live" ? "complete" : row.status}</span>
              <span>{row.alert}</span>
              <span>{row.score}</span>
            </div>
          ))}
        </div>
      </section>
    </DrNewShell>
  );
}
