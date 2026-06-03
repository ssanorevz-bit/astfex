import { getSingleDrDetail, legacyDrNewRows } from "./data/selectors";
import type { LegacyDrNewRow, ThaiDrStatus } from "./data/types";

export type DrNewStatus = ThaiDrStatus;
export type DrNewLane = "fast" | "slow";
export type DrNewRow = LegacyDrNewRow;

export const drNewRows: DrNewRow[] = legacyDrNewRows;

export function getDrNewByTicker(ticker: string) {
  return getSingleDrDetail(ticker);
}

export const drNewMonitor = {
  universe: legacyDrNewRows.length,
  connected: legacyDrNewRows.filter((row) => row.status === "live").length,
  stale: legacyDrNewRows.filter((row) => row.status === "stale").length,
  missing: legacyDrNewRows.filter((row) => row.status === "no-feed").length,
  fastLane: {
    total: legacyDrNewRows.filter((row) => row.lane === "fast").length,
    connected: legacyDrNewRows.filter((row) => row.lane === "fast" && row.status === "live").length,
    stale: legacyDrNewRows.filter((row) => row.lane === "fast" && row.status === "stale").length,
    missing: legacyDrNewRows.filter((row) => row.lane === "fast" && row.status === "no-feed").length
  },
  slowLane: {
    total: legacyDrNewRows.filter((row) => row.lane === "slow").length,
    connected: legacyDrNewRows.filter((row) => row.lane === "slow" && row.status === "live").length,
    stale: legacyDrNewRows.filter((row) => row.lane === "slow" && row.status === "stale").length,
    missing: legacyDrNewRows.filter((row) => row.lane === "slow" && row.status === "no-feed").length
  },
  lastUpdate: "latest EOD",
  requestRate: "static",
  webhookUrl: "not connected"
};
