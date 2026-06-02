import Link from "next/link";
import type { ReactNode } from "react";
import { GlobalTickerSearch } from "./global-ticker-search";

type DrNewShellProps = {
  active: "dashboard" | "detail" | "monitor" | "compare" | "rankings" | "dividends" | "calendar" | "news" | "watchlist" | "learn";
  title: string;
  subtitle: string;
  children: ReactNode;
};

const navGroups = [
  {
    label: "Discover",
    items: [
      { key: "dashboard", label: "DR Screener", href: "/dr-new" },
      { key: "rankings", label: "Rankings", href: "/dr-new/rankings" },
      { key: "dividends", label: "Dividends", href: "/dr-new/dividends" },
      { key: "calendar", label: "Calendar", href: "/dr-new/calendar" }
    ]
  },
  {
    label: "Tools",
    items: [
      { key: "compare", label: "Compare", href: "/dr-new/compare" },
      { key: "watchlist", label: "Watchlist", href: "/dr-new/watchlist" }
    ]
  },
  {
    label: "Education",
    items: [
      { key: "learn", label: "Learn", href: "/dr-new/learn" }
    ]
  }
] as const;

export function DrNewShell({ active, title, subtitle, children }: DrNewShellProps) {
  return (
    <div className="drNewApp">
      <aside className="drNewRail" aria-label="Thai DR Desk navigation">
        <Link className="drNewBrand" href="/dr-new">
          <span>DR</span>
          <strong>Thai DR Desk</strong>
          <small>EOD Data</small>
        </Link>
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
          <span>Market close data</span>
          <p>Data updates after each market close.</p>
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
            <GlobalTickerSearch />
            <span className="drNewSession">EOD Data</span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
