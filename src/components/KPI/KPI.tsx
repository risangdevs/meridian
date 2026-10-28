import { memo } from "react";
import { sum, rollups } from "d3";
import type { DistrictStat, Route, TripRecord } from "../../types";
import { compact, weighted } from "../../utils/aggregate";
import { districtName } from "../../data/districts";
export default memo(function KPI({
  rows,
  stats,
  routes,
}: {
  rows: TripRecord[];
  stats: DistrictStat[];
  routes: Route[];
}) {
  const total = sum(rows, (r) => r.trips);
  const congested = [...stats].sort((a, b) => b.congestion - a.congestion)[0];
  const popular = rollups(
    rows,
    (v) => sum(v, (r) => r.trips),
    (r) => r.mode,
  ).sort((a, b) => b[1] - a[1])[0];
  const items = [
    {
      label: "Total trips",
      value: compact(total),
      detail: "Within selected window",
      large: true,
    },
    {
      label: "Avg. travel time",
      value: total ? weighted(rows, "travelTime").toFixed(1) : "—",
      unit: total ? "min" : "",
      detail: "Weighted by trip volume",
      large: true,
    },
    {
      label: "Most congested",
      value: total ? congested.name : "—",
      detail: total
        ? `${Math.round(congested.congestion * 100)}% congestion index`
        : "No matching trips",
      accent: true,
    },
    {
      label: "Busiest route",
      value: routes.length
        ? `${districtName(routes[0].origin)} → ${districtName(routes[0].destination)}`
        : "—",
      detail: routes.length
        ? `${compact(routes[0].trips)} trips`
        : "No matching trips",
    },
    {
      label: "Leading mode",
      value: popular?.[0] ?? "—",
      detail: popular
        ? `${((popular[1] / total) * 100).toFixed(1)}% of selected trips`
        : "No matching trips",
    },
  ];
  return (
    <div className="kpi-strip" aria-live="polite">
      {items.map((item) => (
        <div className="kpi" key={item.label}>
          <span className="kpi-label">{item.label}</span>
          <div
            className={`${item.large ? "kpi-number" : "kpi-value"} ${item.accent ? "warm" : ""}`}
          >
            {item.value} <small>{item.unit}</small>
          </div>
          <span className="kpi-detail">{item.detail}</span>
        </div>
      ))}
    </div>
  );
});
