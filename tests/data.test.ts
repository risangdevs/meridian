import test from "node:test";
import assert from "node:assert/strict";
import { records, generateData } from "../src/data/generate";
import {
  defaultFilters,
  filterRecords,
  getRoutes,
  getDistrictStats,
  getHours,
  getHeatmap,
  weighted,
} from "../src/utils/aggregate";
import { districts } from "../src/data/districts";
import { MODES } from "../src/types";
const total = (rs: typeof records) => rs.reduce((n, r) => n + r.trips, 0);
test("simulation is reproducible and records satisfy the documented schema", () => {
  assert.deepEqual(generateData(), records);
  assert.equal(districts.length, 20);
  assert.ok(records.length > 50000);
  const keys = new Set();
  for (const r of records) {
    assert.notEqual(r.origin, r.destination);
    assert.ok(r.trips > 0 && Number.isInteger(r.trips));
    assert.ok(r.congestion >= 0 && r.congestion <= 1);
    assert.ok(r.travelTime > 0 && r.distance > 0);
    assert.ok(r.hour >= 0 && r.hour < 24);
    assert.ok(MODES.includes(r.mode));
    keys.add(`${r.origin}|${r.destination}|${r.hour}|${r.dayType}|${r.mode}`);
  }
  assert.equal(keys.size, records.length);
});
test("global filters intersect, time is a half-open range, district direction is respected", () => {
  const filters = {
    ...defaultFilters,
    district: "central",
    direction: "incoming" as const,
    modes: ["Car" as const],
    origin: "northgate",
    hours: [8, 9] as [number, number],
  };
  const rs = filterRecords(records, filters);
  assert.equal(rs.length, 1);
  assert.equal(rs[0].destination, "central");
  assert.equal(rs[0].origin, "northgate");
  assert.equal(rs[0].hour, 8);
  assert.equal(rs[0].mode, "Car");
  assert.equal(
    filterRecords(records, { ...filters, destination: "airport" }).length,
    0,
  );
  assert.equal(
    filterRecords(records, { ...defaultFilters, modes: [] }).length,
    0,
  );
  assert.ok(filterRecords(records, filters, false).some((r) => r.hour !== 8));
});
test("every coordinated aggregation conserves trip totals", () => {
  for (const district of ["", "central"]) {
    const rs = filterRecords(records, { ...defaultFilters, district });
    const t = total(rs);
    assert.equal(
      getRoutes(rs).reduce((n, d) => n + d.trips, 0),
      t,
    );
    assert.equal(
      getHours(rs).reduce((n, d) => n + d.trips, 0),
      t,
    );
    const stats = getDistrictStats(rs);
    assert.equal(
      stats.reduce((n, d) => n + d.departures, 0),
      t,
    );
    assert.equal(
      stats.reduce((n, d) => n + d.arrivals, 0),
      t,
    );
    assert.equal(
      getHeatmap(rs).reduce((n, d) => n + d.trips, 0),
      2 * t,
    );
  }
});
test("averages are trip weighted and empty selections are well defined", () => {
  const rows = [
    { ...records[0], trips: 10, travelTime: 10, congestion: 0.2 },
    { ...records[1], trips: 90, travelTime: 30, congestion: 0.8 },
  ];
  assert.equal(weighted(rows, "travelTime"), 28);
  assert.ok(Math.abs(weighted(rows, "congestion") - 0.74) < 1e-9);
  assert.equal(weighted([], "travelTime"), 0);
  assert.equal(getRoutes([]).length, 0);
  assert.equal(getHeatmap([]).length, 480);
});
