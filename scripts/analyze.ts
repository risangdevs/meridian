import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync } from "node:fs";
import { records, DATA_SEED } from "../src/data/generate";
import {
  defaultFilters,
  filterRecords,
  getHours,
  getDistrictStats,
  getRoutes,
  getHeatmap,
  weighted,
} from "../src/utils/aggregate";
import { districtName } from "../src/data/districts";
import { MODES } from "../src/types";
const sum = (rs: typeof records) => rs.reduce((n, r) => n + r.trips, 0);
const day = (dayType: "Weekday" | "Weekend") =>
  filterRecords(records, { ...defaultFilters, dayType, hours: [0, 24] });
const weekday = day("Weekday"),
  weekend = day("Weekend");
const morning = weekday.filter((r) => r.hour >= 7 && r.hour < 10),
  evening = weekday.filter((r) => r.hour >= 16 && r.hour < 19);
const peak = (rs: typeof records) =>
  getHours(rs)
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 3)
    .map((d) => ({ hour: d.hour, trips: d.trips }));
const districtMovement = (rs: typeof records, id: string) =>
  getDistrictStats(rs).find((d) => d.id === id);
const carCross = weekday.filter(
  (r) => r.mode === "Car" && r.hour >= 7 && r.hour < 10,
);
const { districtById } = await import("../src/data/districts");
const crossing = carCross.filter(
  (r) =>
    districtById.get(r.origin)!.x > 500 !==
    districtById.get(r.destination)!.x > 500,
);
const nonCrossing = carCross.filter(
  (r) =>
    districtById.get(r.origin)!.x > 500 ===
    districtById.get(r.destination)!.x > 500,
);
const runs: number[] = [];
for (let i = 0; i < 30; i++) {
  const t = performance.now();
  const rs = filterRecords(records, defaultFilters);
  getRoutes(rs);
  getDistrictStats(rs);
  getHours(rs);
  getHeatmap(rs);
  runs.push(performance.now() - t);
}
runs.sort((a, b) => a - b);
const output = {
  seed: DATA_SEED,
  records: records.length,
  weekdayTrips: sum(weekday),
  weekendTrips: sum(weekend),
  weekendChangePercent: (sum(weekend) / sum(weekday) - 1) * 100,
  weekdayPeak: peak(weekday),
  weekendPeak: peak(weekend),
  morningTrips: sum(morning),
  eveningTrips: sum(evening),
  morningCentral: districtMovement(morning, "central"),
  eveningCentral: districtMovement(evening, "central"),
  morningFinancial: districtMovement(morning, "financial"),
  eveningFinancial: districtMovement(evening, "financial"),
  weekdayModes: MODES.map((mode) => ({
    mode,
    trips: sum(weekday.filter((r) => r.mode === mode)),
    sharePercent:
      (sum(weekday.filter((r) => r.mode === mode)) / sum(weekday)) * 100,
    averageMinutes: weighted(
      weekday.filter((r) => r.mode === mode),
      "travelTime",
    ),
  })),
  weekdayCongestion: getDistrictStats(weekday)
    .sort((a, b) => b.congestion - a.congestion)
    .slice(0, 5),
  weekendArrivals: getDistrictStats(weekend)
    .sort((a, b) => b.arrivals - a.arrivals)
    .slice(0, 5),
  morningRoutes: getRoutes(morning)
    .slice(0, 3)
    .map((r) => ({
      ...r,
      origin: districtName(r.origin),
      destination: districtName(r.destination),
    })),
  crossRiverCars: {
    crossingTrips: sum(crossing),
    nonCrossingTrips: sum(nonCrossing),
    crossingCongestion: weighted(crossing, "congestion"),
    nonCrossingCongestion: weighted(nonCrossing, "congestion"),
  },
  nightShare: (sum(weekday.filter((r) => r.hour < 5)) / sum(weekday)) * 100,
  performance: {
    runtime: process.version,
    records: records.length,
    runs: 30,
    medianMs: runs[15],
    p95Ms: runs[28],
    description:
      "Node: filter full dataset + routes, districts, hours, heatmap. Excludes browser rendering.",
  },
};
mkdirSync("docs", { recursive: true });
writeFileSync("docs/analysis.json", JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify(output, null, 2));
