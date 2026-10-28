import { memo, useEffect, useRef } from "react";
import * as d3 from "d3";
import { districts } from "../../data/districts";
import { congestionColor, duration } from "../../scales";
import { useElementSize } from "../../hooks/useElementSize";
import { useTooltip } from "../../hooks/useTooltip";
import { getHeatmap, hourLabel, compact } from "../../utils/aggregate";
export default memo(function CongestionHeatmap({
  cells,
  range,
  selected,
  onSelect,
}: {
  cells: ReturnType<typeof getHeatmap>;
  range: [number, number];
  selected: string;
  onSelect: (id: string, hour: number) => void;
}) {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTooltip();
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const x = d3
      .scaleBand()
      .domain(d3.range(24).map(String))
      .range([108, width - 10])
      .padding(0.11);
    const y = d3
      .scaleBand()
      .domain(districts.map((d) => d.id))
      .range([22, 370])
      .padding(0.16);
    svg
      .select<SVGGElement>(".labels")
      .selectAll<SVGTextElement, (typeof districts)[number]>("text")
      .data(districts)
      .join("text")
      .attr("x", 98)
      .attr("y", (d) => y(d.id)! + y.bandwidth() / 2 + 3.5)
      .attr("text-anchor", "end")
      .attr("fill", (d) => (d.id === selected ? "#b5e88b" : "#95a6aa"))
      .attr("font-size", 11)
      .text((d) => d.name);
    svg
      .select<SVGGElement>(".hours")
      .selectAll("text")
      .data(d3.range(0, 24, 3))
      .join("text")
      .attr("x", (d) => x(String(d))! + x.bandwidth() / 2)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#7d9195")
      .attr("font-size", 11)
      .text((d) => String(d).padStart(2, "0"));
    const rects = svg
      .select<SVGGElement>(".cells")
      .selectAll<SVGRectElement, (typeof cells)[number]>("rect")
      .data(cells, (d) => `${d.id}-${d.hour}`)
      .join("rect")
      .attr("x", (d) => x(String(d.hour))!)
      .attr("y", (d) => y(d.id)!)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 1)
      .attr("role", "button")
      .attr("tabindex", (_, i) => (i === 0 ? 0 : -1))
      .attr(
        "aria-label",
        (d) =>
          `${d.name}, ${hourLabel(d.hour)}, ${Math.round(d.congestion * 100)}% congestion`,
      )
      .on("mousemove", (e, d) =>
        tip.show(
          e,
          `${d.name} / ${hourLabel(d.hour)}`,
          d.trips
            ? `${Math.round(d.congestion * 100)}% congestion · ${compact(d.trips)} trips`
            : "No matching trips",
        ),
      )
      .on("mouseleave", tip.hide)
      .on("click", (_, d) => onSelect(d.id, d.hour))
      .on("keydown", function (e: KeyboardEvent, d) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(d.id, d.hour);
          return;
        }
        const step: Record<string, number> = {
          ArrowRight: 1,
          ArrowLeft: -1,
          ArrowDown: 24,
          ArrowUp: -24,
        };
        if (step[e.key]) {
          e.preventDefault();
          const nodes = svg
            .selectAll<SVGRectElement, unknown>(".cells rect")
            .nodes();
          const next =
            nodes[
              Math.max(
                0,
                Math.min(nodes.length - 1, nodes.indexOf(this) + step[e.key]),
              )
            ];
          d3.select(this).attr("tabindex", -1);
          d3.select(next).attr("tabindex", 0);
          next.focus();
        }
      })
      .on("focus", function (_, d) {
        const box = this.getBoundingClientRect();
        tip.show(
          { clientX: box.x, clientY: box.y },
          `${d.name} / ${hourLabel(d.hour)}`,
          d.trips
            ? `${Math.round(d.congestion * 100)}% congestion · ${compact(d.trips)} trips`
            : "No matching trips",
        );
      })
      .on("blur", tip.hide);
    rects
      .transition()
      .duration(duration())
      .attr("fill", (d) =>
        d.trips ? congestionColor(d.congestion) : "#19272b",
      )
      .attr(
        "opacity",
        (d) =>
          (d.hour >= range[0] && d.hour < range[1] ? 1 : 0.28) *
          (selected && d.id !== selected ? 0.6 : 1),
      )
      .attr("stroke", (d) => (d.id === selected ? "#b5e88b" : "none"))
      .attr("stroke-width", 0.5);
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [cells, width, range, selected, onSelect, tip.show, tip.hide]);
  return (
    <section className="panel heatmap-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">04 / PRESSURE POINTS</span>
          <h2>Congestion, hour by hour</h2>
        </div>
        <div className="heatmap-legend">
          <span>0%</span>
          <i className="heat-gradient" />
          <span>100%</span>
        </div>
      </div>
      <div ref={ref} className="heatmap-scroll">
        <svg
          ref={svgRef}
          width="100%"
          height="380"
          aria-label="District by hour congestion heatmap"
        >
          <g className="labels" />
          <g className="hours" />
          <g className="cells" />
        </svg>
      </div>
      <div className="chart-note">
        Trip-weighted congestion · dimmed hours are outside your selection
      </div>
      {tip.element}
    </section>
  );
});
