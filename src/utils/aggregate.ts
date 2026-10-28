import { rollups, sum, descending } from "d3";
import { districts } from "../data/districts";
import {
  MODES,
  type Filters,
  type TripRecord,
  type Route,
  type DistrictStat,
  type HourStat,
} from "../types";
export const defaultFilters: Filters = {
  hours: [7, 10],
  modes: [...MODES],
  dayType: "Weekday",
  origin: "",
  destination: "",
  district: "",
  direction: "both",
};
export function filterRecords(
  records: TripRecord[],
  f: Filters,
  includeTime = true,
) {
  return records.filter(
    (r) =>
      r.dayType === f.dayType &&
      f.modes.includes(r.mode) &&
      (!includeTime || (r.hour >= f.hours[0] && r.hour < f.hours[1])) &&
      (!f.origin || r.origin === f.origin) &&
      (!f.destination || r.destination === f.destination) &&
      (!f.district ||
        (f.direction === "incoming"
          ? r.destination === f.district
          : f.direction === "outgoing"
            ? r.origin === f.district
            : r.origin === f.district || r.destination === f.district)),
  );
}
export const weighted = (
  rows: TripRecord[],
  key: "travelTime" | "congestion",
) => {
  const n = sum(rows, (r) => r.trips);
  return n ? sum(rows, (r) => r.trips * r[key]) / n : 0;
};
export function getRoutes(rows: TripRecord[]): Route[] {
  return rollups(
    rows,
    (rs) => ({
      trips: sum(rs, (r) => r.trips),
      congestion: weighted(rs, "congestion"),
      travelTime: weighted(rs, "travelTime"),
      mode: rollups(
        rs,
        (v) => sum(v, (r) => r.trips),
        (r) => r.mode,
      ).sort((a, b) => descending(a[1], b[1]))[0][0],
    }),
    (r) => r.origin,
    (r) => r.destination,
  )
    .flatMap(([origin, ds]) =>
      ds.map(([destination, values]) => ({
        id: `${origin}-${destination}`,
        origin,
        destination,
        ...values,
      })),
    )
    .sort((a, b) => b.trips - a.trips);
}
export function getDistrictStats(rows: TripRecord[]): DistrictStat[] {
  const grouped = new Map<string, TripRecord[]>();
  for (const r of rows)
    for (const id of [r.origin, r.destination]) {
      const group = grouped.get(id);
      if (group) group.push(r);
      else grouped.set(id, [r]);
    }
  return districts.map((d) => {
    const rs = grouped.get(d.id) ?? [];
    return {
      id: d.id,
      name: d.name,
      departures: sum(rs, (r) => (r.origin === d.id ? r.trips : 0)),
      arrivals: sum(rs, (r) => (r.destination === d.id ? r.trips : 0)),
      congestion: weighted(rs, "congestion"),
      travelTime: weighted(rs, "travelTime"),
      total: sum(rs, (r) => r.trips),
    };
  });
}
export function getHours(rows: TripRecord[]): HourStat[] {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    trips: 0,
    Metro: 0,
    Bus: 0,
    Car: 0,
    Bike: 0,
  }));
  for (const r of rows) {
    hours[r.hour].trips += r.trips;
    hours[r.hour][r.mode] += r.trips;
  }
  return hours;
}
export function getHeatmap(rows: TripRecord[]) {
  const cells = new Map<string, { trips: number; weighted: number }>();
  for (const r of rows)
    for (const id of [r.origin, r.destination]) {
      const key = `${id}-${r.hour}`;
      const c = cells.get(key) ?? { trips: 0, weighted: 0 };
      c.trips += r.trips;
      c.weighted += r.trips * r.congestion;
      cells.set(key, c);
    }
  return districts.flatMap((d) =>
    Array.from({ length: 24 }, (_, hour) => {
      const c = cells.get(`${d.id}-${hour}`);
      return {
        id: d.id,
        name: d.name,
        hour,
        trips: c?.trips ?? 0,
        congestion: c ? c.weighted / c.trips : 0,
      };
    }),
  );
}
export const compact = (n: number) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(2)}m`
    : n >= 1e3
      ? `${(n / 1e3).toFixed(1)}k`
      : Math.round(n).toLocaleString();
export const hourLabel = (n: number) => `${String(n).padStart(2, "0")}:00`;
