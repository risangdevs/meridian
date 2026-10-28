import { memo, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { DistrictStat, RankingMetric } from "../../types";
import { compact } from "../../utils/aggregate";
import { useElementSize } from "../../hooks/useElementSize";
import { duration, congestionColor } from "../../scales";
export default memo(function RankingChart({
  stats,
  onDistrict,
}: {
  stats: DistrictStat[];
  onDistrict: (id: string) => void;
}) {
  const [metric, setMetric] = useState<RankingMetric>("departures");
  const { ref, width } = useElementSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const data = [...stats]
      .filter((d) => d.total > 0)
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 8);
    const svg = d3.select(svgRef.current!);
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d[metric]) || 1])
      .range([0, width - 78]);
    const y = d3
      .scaleBand()
      .domain(data.map((d) => d.id))
      .range([8, 366])
      .padding(0.22);
    const groups = svg
      .selectAll<SVGGElement, DistrictStat>("g.rank-row")
      .data(data, (d) => d.id)
      .join(
        (enter) => {
          const g = enter
            .append("g")
            .attr("class", "rank-row")
            .attr("opacity", 0)
            .attr("transform", "translate(0,370)");
          g.append("text").attr("class", "rank-name");
          g.append("text").attr("class", "rank-value");
          g.append("rect").attr("class", "rank-track");
          g.append("rect").attr("class", "rank-bar");
          g.append("title");
          return g;
        },
        (update) => update,
        (exit) =>
          exit.transition().duration(duration()).attr("opacity", 0).remove(),
      )
      .attr("role", "button")
      .attr("tabindex", 0)
      .attr("aria-label", (d) => `Select ${d.name}`)
      .on("click", (_, d) => onDistrict(d.id))
      .on("keydown", (e, d) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDistrict(d.id);
        }
      });
    groups
      .transition()
      .duration(duration())
      .attr("transform", (d) => `translate(22,${y(d.id)})`)
      .attr("opacity", 1);
    groups
      .select(".rank-name")
      .attr("fill", "#c5cfcf")
      .attr("font-size", 12)
      .attr("y", 12)
      .text((d, i) => `${String(i + 1).padStart(2, "0")}   ${d.name}`);
    const format = (d: DistrictStat) =>
      metric === "congestion"
        ? `${Math.round(d[metric] * 100)}%`
        : metric === "travelTime"
          ? `${d[metric].toFixed(1)} min`
          : compact(d[metric]);
    groups
      .select(".rank-value")
      .attr("x", width - 44)
      .attr("y", 12)
      .attr("text-anchor", "end")
      .attr("fill", "#d7e4d3")
      .attr("font-size", 12)
      .attr("class", "rank-value mono")
      .text(format);
    groups
      .select(".rank-track")
      .attr("x", 0)
      .attr("y", 23)
      .attr("width", width - 44)
      .attr("height", 4)
      .attr("fill", "#253238");
    groups
      .select(".rank-bar")
      .attr("x", 0)
      .attr("y", 23)
      .attr("height", 4)
      .attr("fill", (d) =>
        metric === "congestion" ? congestionColor(d.congestion) : "#a7d585",
      )
      .transition()
      .duration(duration())
      .attr("width", (d) => x(d[metric]));
    groups
      .select("title")
      .text((d) => `${d.name}: ${format(d)}. Click to explore district.`);
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [stats, metric, width, onDistrict]);
  return (
    <section className="panel ranking-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">05 / DISTRICT RANKING</span>
          <h2>At the center of movement</h2>
        </div>
      </div>
      <div className="rank-select">
        <select
          aria-label="Ranking metric"
          value={metric}
          onChange={(e) => setMetric(e.target.value as RankingMetric)}
        >
          <option value="departures">Most departures</option>
          <option value="arrivals">Most arrivals</option>
          <option value="congestion">Highest congestion</option>
          <option value="travelTime">Longest travel time</option>
        </select>
        <span>TOP 8 / 20</span>
      </div>
      <div ref={ref}>
        {!stats.some((s) => s.total) && (
          <div className="empty-chart">No districts to rank.</div>
        )}
        <svg
          ref={svgRef}
          width="100%"
          height="375"
          aria-label="Busiest district ranking"
        />
      </div>
    </section>
  );
});
