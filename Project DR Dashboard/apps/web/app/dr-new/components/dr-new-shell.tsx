import Link from "next/link";
import type { ReactNode } from "react";
import { getCoverageCounts } from "../data";
import { GlobalTickerSearch } from "./global-ticker-search";

type DrNewShellProps = {
  active: "dashboard" | "discover" | "market-map" | "detail" | "monitor" | "compare" | "dividends" | "calendar" | "news" | "learn";
  title: string;
  subtitle: string;
  children: ReactNode;
};

const drStoryFacebookUrl = "https://www.facebook.com/";

const navGroups = [
  {
    label: "Discover",
    items: [
      { key: "discover", label: "Story Discovery", href: "/discover" },
      { key: "dashboard", label: "DR Screener", href: "/dr-new" },
      { key: "market-map", label: "Market Map", href: "/dr-new/market-map" },
      { key: "dividends", label: "Dividends", href: "/dr-new/dividends" },
      { key: "calendar", label: "Calendar", href: "/dr-new/calendar" }
    ]
  },
  {
    label: "Tools",
    items: [
      { key: "compare", label: "Compare DR", href: "/dr-new/compare" }
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
  const showDrStoryBanner = active === "dashboard" || active === "discover";

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
      </aside>

      <main className="drNewMain">
        <header className="drNewTop">
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <div className="drNewCommandBar" role="search">
            {active === "dashboard" || active === "discover" || active === "market-map" || active === "compare" || active === "dividends" || active === "calendar" || active === "learn" ? null : <GlobalTickerSearch />}
            <a className="drNewSession drNewFacebookButton" href={drStoryFacebookUrl} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.6 1.7-1.6H16V4.8c-.3 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.3V11H8.7v3h2.4v7h2.4Z" fill="currentColor" />
              </svg>
              <span>Follow DR Story</span>
            </a>
          </div>
        </header>
        {showDrStoryBanner ? (
          <section className="drStoryBanner" aria-label="DR Story">
            <img src="/dr-story-logo-ui.png" alt="DR Story" width={72} height={46} />
            <p>หุ้นโลก ลงทุนง่าย ผ่าน <strong>DR</strong></p>
          </section>
        ) : null}
        {children}
      </main>
    </div>
  );
}
