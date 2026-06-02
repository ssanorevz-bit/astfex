import Link from "next/link";
import { DrNewShell } from "../components/dr-new-shell";
import { drNewRows } from "../mock-dr-new-data";

export const metadata = {
  title: "Thai DR EOD News Sandbox",
  description: "Mock EOD news hub for SET, issuer, underlying, and broker research streams"
};

const newsKinds = ["SET DR News", "Issuer notice", "Underlying earnings", "Broker research", "Macro catalyst"];

export default function DrNewNewsPage() {
  const rows = drNewRows.slice(0, 12).map((row, index) => ({
    row,
    kind: newsKinds[index % newsKinds.length],
    title: index % 3 === 0 ? `${row.company} ${row.nextEvent}` : `${row.ticker} ${row.alert}`,
    urgency: index % 4 === 0 ? "High" : index % 3 === 0 ? "Watch" : "Normal"
  }));

  return (
    <DrNewShell
      active="news"
      title="News Hub"
      subtitle="Mock EOD source queue separating SET/issuer official notices, underlying company catalysts, broker research, and macro context."
    >
      <section className="drNewNewsGrid">
        {["SET / issuer", "Underlying", "Broker / research"].map((bucket) => (
          <article className="drNewPanel" key={bucket}>
            <div className="drNewPanelHead">
              <p className="drNewKicker">Source bucket</p>
              <h2>{bucket}</h2>
            </div>
            <div className="drNewNewsList">
              {rows.filter((item) => bucket === "SET / issuer" ? item.kind.includes("SET") || item.kind.includes("Issuer") : bucket === "Underlying" ? item.kind.includes("Underlying") || item.kind.includes("Macro") : item.kind.includes("Broker")).slice(0, 5).map((item) => (
                <Link href={`/dr-new/${item.row.ticker}`} key={`${bucket}-${item.row.ticker}`}>
                  <strong>{item.row.ticker}</strong>
                  <span>{item.title}<small>{item.kind} · {item.urgency}</small></span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>
    </DrNewShell>
  );
}
