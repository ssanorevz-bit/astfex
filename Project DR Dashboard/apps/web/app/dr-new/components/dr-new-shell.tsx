import Link from "next/link";
import type { ReactNode } from "react";
import { getCoverageCounts } from "../data";
import { GlobalTickerSearch } from "./global-ticker-search";

type DrNewShellProps = {
  active: "dashboard" | "market-map" | "detail" | "monitor" | "compare" | "dividends" | "calendar" | "news" | "learn";
  title: string;
  subtitle: string;
  children: ReactNode;
};

const navGroups = [
  {
    label: "Discover",
    items: [
      { key: "dashboard", label: "DR Screener", href: "/dr-new" },
      { key: "market-map", label: "Market Map", href: "/dr-new/market-map" },
      { key: "dividends", label: "Dividends", href: "/dr-new/dividends" },
      { key: "calendar", label: "Calendar", href: "/dr-new/calendar" }
    ]
  },
  {
    label: "Tools",
    items: [
      { key: "compare", label: "Compare DRs", href: "/dr-new/compare" }
    ]
  },
  {
    label: "Education",
    items: [
      { key: "learn", label: "DR Academy", href: "/dr-new/learn" }
    ]
  }
] as const;

export function DrNewShell({ active, title, subtitle, children }: DrNewShellProps) {
  const coverage = getCoverageCounts();
  const showDrStoryBanner = active === "dashboard";

  return (
    <div className="drNewApp">
      <aside className="drNewRail" aria-label="Thai DR Desk navigation">
        <Link className="drNewBrand" href="/dr-new" aria-label="DR Story">
          <span className="drStoryBrandMark">
            <img src="/dr-story-logo.png" alt="DR Story" width={220} height={150} />
          </span>
        </Link>
        <div className="drNewRailSnapshot" aria-label="Thai DR market snapshot">
          <div>
            <strong>{coverage.totalThaiDrs.toLocaleString("en-US")}</strong>
            <span>Thai DRs</span>
          </div>
          <div>
            <strong>{coverage.totalUniqueUnderlyings.toLocaleString("en-US")}</strong>
            <span>Global Stocks</span>
          </div>
          <div>
            <strong>6</strong>
            <span>Markets</span>
          </div>
        </div>
        <nav className="drNewNav">
          {navGroups.map((group) => (
            <div className="drNewNavGroup" key={group.label}>
              <span>{group.label}</span>
              {group.items.map((item) => (
                <Link
                  key={item.key}
                  className={active === item.key || (active === "detail" && item.key === "dashboard") ? "active" : ""}
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="drNewRailNote">
          <span>Market Status</span>
          <strong>Thai DR market closed</strong>
          <p>Updated after SET close</p>
          <small>16:35 ICT</small>
        </div>
      </aside>

      <main className="drNewMain">
        <header className="drNewTop">
          <div>
            <p className="drNewKicker">Thai DR Desk</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="drNewCommandBar" role="search">
            {active === "dashboard" || active === "market-map" || active === "compare" || active === "dividends" || active === "calendar" || active === "learn" ? null : <GlobalTickerSearch />}
            <span className="drNewSession">Market Closed</span>
          </div>
        </header>
        {showDrStoryBanner ? (
          <section className="drStoryBanner" aria-label="DR Story">
            <img src="/dr-story-logo-ui.png" alt="DR Story" width={72} height={46} />
            <p>Global opportunities through <strong>Thai DRs.</strong></p>
          </section>
        ) : null}
        {children}
      </main>
    </div>
  );
}
