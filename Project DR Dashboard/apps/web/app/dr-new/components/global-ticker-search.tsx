"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getDrNewProfile } from "../dr-new-derived";
import { drNewRows } from "../mock-dr-new-data";

function formatTurnover(value: number) {
  if (value >= 1) return `THB ${value.toFixed(2)}M`;
  return `THB ${(value * 1000).toFixed(0)}K`;
}

export function GlobalTickerSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const normalized = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalized) return drNewRows.slice(0, 8);
    return drNewRows
      .filter((row) => [row.ticker, row.underlying, row.company, row.issuer, row.theme, row.region]
        .some((value) => value.toLowerCase().includes(normalized)))
      .slice(0, 8);
  }, [normalized]);

  function goToTicker(ticker: string) {
    setQuery("");
    setOpen(false);
    router.push(`/dr-new/${ticker}`);
  }

  function submit() {
    const target = matches[0];
    if (target) goToTicker(target.ticker);
  }

  return (
    <div className="drNewGlobalSearch">
      <label>
        <span>Search</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Ticker, issuer, theme"
        />
      </label>
      {open ? (
        <div className="drNewSearchMenu">
          {matches.length ? matches.map((row) => {
            const profile = getDrNewProfile(row);
            return (
              <button type="button" key={row.ticker} onClick={() => goToTicker(row.ticker)}>
                <strong>{row.ticker}<small>{row.underlying} · {row.issuer}</small></strong>
                <span>{row.company}<small>{profile.sector}</small></span>
                <span>{formatTurnover(row.turnoverM)}</span>
              </button>
            );
          }) : (
            <div className="drNewSearchEmpty">No DR matches this search.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
