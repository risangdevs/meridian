import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { districts, districtById, districtName } from "../../data/districts";
import type { DistrictStat, Route, Filters } from "../../types";
import { modeColor, congestionColor, duration } from "../../scales";
import { compact } from "../../utils/aggregate";
import { useTooltip } from "../../hooks/useTooltip";
import { useElementSize } from "../../hooks/useElementSize";
interface Props {
  routes: Route[];
  stats: DistrictStat[];
  filters: Filters;
  onDistrict: (id: string) => void;
  onDirection: (direction: Filters["direction"]) => void;
}
const routePath = (r: Route) => {
  const a = districtById.get(r.origin)!,
    b = districtById.get(r.destination)!;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  return `M${a.x},${a.y} Q${(a.x + b.x) / 2 - dy * 0.2},${(a.y + b.y) / 2 + dx * 0.2} ${b.x},${b.y}`;
};
export default memo(function FlowMap({
  routes,
  stats,
  filters,
  onDistrict,
  onDirection,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null),
    layerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [encoding, setEncoding] = useState<"mode" | "congestion">("mode");
  const tip = useTooltip();
  const { ref: mapRef, width: mapWidth } = useElementSize<HTMLDivElement>();
  const visible = useMemo(
    () => routes.slice(0, mapWidth < 500 ? 30 : 60),
    [routes, mapWidth],
  );
  const cells = useMemo(() => {
    const v = d3.Delaunay.from(
      districts,
      (d) => d.x,
      (d) => d.y,
    ).voronoi([55, 25, 840, 563]);
    return districts.map((d, i) => ({ ...d, path: v.renderCell(i) }));
  }, []);
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const z = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 5])
      .translateExtent([
        [-250, -180],
        [1150, 750],
      ])
      .extent([
        [0, 0],
        [900, 590],
      ])
      .filter((e) => e.type !== "wheel" || e.ctrlKey || e.metaKey)
      .on("zoom", (e) =>
        d3.select(layerRef.current).attr("transform", e.transform),
      );
    svg.call(z);
    zoomRef.current = z;
    return () => {
      svg.on(".zoom", null);
    };
  }, []);
  useEffect(() => {
    const root = d3.select(layerRef.current!);
    const statMap = new Map(stats.map((d) => [d.id, d]));
    root
      .select<SVGGElement>(".districts")
      .selectAll<SVGPathElement, (typeof cells)[number]>("path")
      .data(cells, (d) => d.id)
      .join("path")
      .attr("d", (d) => d.path)
      .attr("class", "district-area")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `Select ${d.name} district`)
      .on("click", (_, d) => onDistrict(d.id))
      .on("keydown", (e, d) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDistrict(d.id);
        }
      })
      .on("mousemove", (e, d) => {
        const s = statMap.get(d.id)!;
        tip.show(
          e,
          d.name,
          `${compact(s.departures)} departures · ${compact(s.arrivals)} arrivals`,
        );
      })
      .on("mouseleave", tip.hide)
      .transition()
      .duration(duration())
      .attr("fill", (d) =>
        filters.district === d.id
          ? "#304337"
          : d.jobs > 1.5
            ? "#233132"
            : "#1c292d",
      )
      .attr("stroke", (d) =>
        filters.district === d.id ? "#b5e88b" : "#405052",
      )
      .attr("stroke-width", (d) => (filters.district === d.id ? 2 : 0.7));
    const width = d3
      .scaleSqrt()
      .domain([0, d3.max(visible, (d) => d.trips) || 1])
      .range([0.6, 6]);
    const paths = root
      .select<SVGGElement>(".routes")
      .selectAll<SVGPathElement, Route>("path")
      .data(visible, (d) => d.id)
      .join(
        (enter) => enter.append("path").attr("opacity", 0).attr("d", routePath),
        (update) => update,
        (exit) =>
          exit.transition().duration(duration()).attr("opacity", 0).remove(),
      );
    paths
      .attr("fill", "none")
      .attr("class", "route-line")
      .attr("marker-end", "url(#route-arrow)")
      .attr("stroke", (d) =>
        encoding === "mode" ? modeColor[d.mode] : congestionColor(d.congestion),
      )
      .attr("tabindex", 0)
      .attr(
        "aria-label",
        (d) =>
          `${districtName(d.origin)} to ${districtName(d.destination)}, ${d.trips.toLocaleString()} trips`,
      )
      .on("mousemove", function (e, d) {
        d3.select(this).attr("opacity", 1);
        tip.show(
          e,
          `${districtName(d.origin)} → ${districtName(d.destination)}`,
          `${compact(d.trips)} trips · ${d.travelTime.toFixed(0)} min · ${(d.congestion * 100).toFixed(0)}% congestion`,
        );
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 0.55);
        tip.hide();
      })
      .transition()
      .duration(duration())
      .attr("stroke-width", (d) => width(d.trips))
      .attr("opacity", 0.55)
      .attr("d", routePath);
    root
      .select<SVGGElement>(".particles")
      .selectAll<SVGPathElement, Route>("path")
      .data(visible.slice(0, 20), (d) => d.id)
      .join("path")
      .attr("d", routePath)
      .attr("class", "flow-particle")
      .attr("fill", "none")
      .attr("stroke", (d) =>
        encoding === "mode" ? modeColor[d.mode] : congestionColor(d.congestion),
      )
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "2 36")
      .style("animation-duration", (d) => `${Math.max(2, d.travelTime / 7)}s`);
    const nodes = root
      .select<SVGGElement>(".district-nodes")
      .selectAll<SVGGElement, (typeof districts)[number]>("g")
      .data(districts, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g");
        g.append("circle");
        g.append("text");
        return g;
      })
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("pointer-events", "none");
    nodes
      .select("circle")
      .attr("r", (d) => (filters.district === d.id ? 6 : 3.5))
      .attr("fill", (d) =>
        statMap.get(d.id)!.total > 0 ? "#d5e6d2" : "#536465",
      )
      .attr("stroke", "#142224")
      .attr("stroke-width", 2);
    nodes
      .select("text")
      .attr("dy", -12)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => (filters.district === d.id ? "#c8f69f" : "#a4b8b8"))
      .attr("font-size", mapWidth < 500 ? 22 : 11)
      .attr("font-weight", (d) => (d.id === "central" ? 700 : 400))
      .attr("paint-order", "stroke")
      .attr("stroke", "#1c292d")
      .attr("stroke-width", 3)
      .text((d) =>
        mapWidth >= 500 ||
        filters.district === d.id ||
        [
          "central",
          "financial",
          "airport",
          "northgate",
          "harbor",
          "westpark",
          "southgate",
        ].includes(d.id)
          ? d.name
          : "",
      );
    return () => {
      root.selectAll("*").interrupt();
    };
  }, [
    visible,
    stats,
    filters.district,
    encoding,
    cells,
    onDistrict,
    tip.show,
    tip.hide,
    mapWidth,
  ]);
  const zoomBy = (factor: number) => {
    if (zoomRef.current)
      d3.select(svgRef.current!)
        .transition()
        .duration(duration())
        .call(zoomRef.current.scaleBy, factor);
  };
  const shownTrips = d3.sum(visible, (d) => d.trips),
    total = d3.sum(routes, (d) => d.trips);
  return (
    <section className="panel map-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 / SPATIAL EXPLORATION</span>
          <h2>Where the city moves</h2>
        </div>
        <select
          aria-label="Map color encoding"
          value={encoding}
          onChange={(e) => setEncoding(e.target.value as typeof encoding)}
        >
          <option value="mode">Color by mode</option>
          <option value="congestion">Color by congestion</option>
        </select>
      </div>
      <div className="map-canvas" ref={mapRef}>
        <svg
          ref={svgRef}
          viewBox="0 0 900 590"
          aria-label="Interactive schematic mobility flow map"
        >
          <defs>
            <marker
              id="route-arrow"
              viewBox="0 -3 6 6"
              refX="8"
              refY="0"
              markerWidth="7"
              markerHeight="7"
              markerUnits="userSpaceOnUse"
              orient="auto"
            >
              <path d="M0,-3L6,0L0,3" fill="context-stroke" />
            </marker>
            <pattern
              id="map-grid"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".6" fill="#304247" />
            </pattern>
          </defs>
          <rect width="900" height="590" fill="url(#map-grid)" />
          <g ref={layerRef}>
            <g className="districts" />
            <path
              className="river"
              d="M515 -20 C410 60 655 100 560 197 S469 275 521 335 S691 416 627 620"
              fill="none"
              stroke="#111e26"
              strokeWidth="30"
              pointerEvents="none"
            />
            <path
              d="M515 -20 C410 60 655 100 560 197 S469 275 521 335 S691 416 627 620"
              fill="none"
              stroke="#31434c"
              strokeWidth="1"
              strokeDasharray="3 5"
              pointerEvents="none"
            />
            <text
              x="683"
              y="477"
              transform="rotate(60 683 477)"
              fill="#657d85"
              fontSize="11"
              letterSpacing="4"
              pointerEvents="none"
            >
              ALDER RIVER
            </text>
            <g className="routes" />
            <g className="particles" pointerEvents="none" />
            <g className="district-nodes" />
          </g>
        </svg>
        <div className="map-north">
          N<span>↑</span>
        </div>
        <div className="map-tools">
          <button aria-label="Zoom in" onClick={() => zoomBy(1.4)}>
            <Plus size={16} />
          </button>
          <button aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>
            <Minus size={16} />
          </button>
          <button
            aria-label="Reset map view"
            onClick={() => {
              if (zoomRef.current)
                d3.select(svgRef.current!)
                  .transition()
                  .duration(duration())
                  .call(zoomRef.current.transform, d3.zoomIdentity);
            }}
          >
            <LocateFixed size={16} />
          </button>
        </div>
        <div className="map-key">
          {encoding === "mode" ? (
            <>
              <i className="sample-line" />
              Width = trip volume · color = leading mode
            </>
          ) : (
            <>
              <i className="heat-gradient" />
              Low → high congestion
            </>
          )}
        </div>
        {total === 0 && (
          <div className="map-empty">No routes match these filters.</div>
        )}
      </div>
      <div className="map-footer">
        <span>
          {visible.length} busiest routes ·{" "}
          {total ? Math.round((shownTrips / total) * 100) : 0}% of trips
          <span className="desktop-note">
            {" "}
            · drag to pan / Ctrl + scroll to zoom
          </span>
        </span>
        <div className="segmented">
          {(["both", "incoming", "outgoing"] as const).map((d) => (
            <button
              key={d}
              disabled={!filters.district}
              className={filters.direction === d ? "active" : ""}
              onClick={() => onDirection(d)}
            >
              {d === "both" ? "All directions" : d}
            </button>
          ))}
        </div>
      </div>
      {tip.element}
    </section>
  );
});
