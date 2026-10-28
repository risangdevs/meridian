import { memo, useEffect, useRef } from "react";
import * as d3 from "d3";
import type { HourStat } from "../../types";
import { useElementSize } from "../../hooks/useElementSize";
import { duration } from "../../scales";
import { useTooltip } from "../../hooks/useTooltip";
import { compact, hourLabel } from "../../utils/aggregate";
export default memo(function Timeline({
  hours,
  range,
  onRange,
}: {
  hours: HourStat[];
  range: [number, number];
  onRange: (range: [number, number]) => void;
}) {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const tip = useTooltip();
  const brushRef = useRef<d3.BrushBehavior<unknown> | null>(null);
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const x = d3
      .scaleLinear()
      .domain([0, 24])
      .range([50, width - 20]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(hours, (d) => d.trips) || 1])
      .nice()
      .range([122, 10]);
    svg
      .select<SVGGElement>(".x-axis")
      .attr("transform", "translate(0,130)")
      .call(
        d3
          .axisBottom(x)
          .tickValues([0, 3, 6, 9, 12, 15, 18, 21, 24])
          .tickFormat((d) => `${String(d).padStart(2, "0")}:00`)
          .tickSize(0),
      )
      .select(".domain")
      .remove();
    svg
      .select<SVGGElement>(".y-axis")
      .attr("transform", "translate(45,0)")
      .call(
        d3
          .axisLeft(y)
          .ticks(3)
          .tickFormat((d) => compact(+d))
          .tickSize(-(width - 65)),
      )
      .select(".domain")
      .remove();
    const a = d3
      .area<HourStat>()
      .x((d) => x(d.hour + 0.5))
      .y0(122)
      .y1((d) => y(d.trips))
      .curve(d3.curveMonotoneX);
    svg
      .select<SVGPathElement>(".activity-area")
      .datum(hours)
      .transition()
      .duration(duration())
      .attr("d", a);
    const l = d3
      .line<HourStat>()
      .x((d) => x(d.hour + 0.5))
      .y((d) => y(d.trips))
      .curve(d3.curveMonotoneX);
    svg
      .select<SVGPathElement>(".activity-line")
      .datum(hours)
      .transition()
      .duration(duration())
      .attr("d", l);
    svg
      .select<SVGGElement>(".hour-hits")
      .selectAll<SVGRectElement, HourStat>("rect")
      .data(hours, (d) => d.hour)
      .join((enter) => {
        const r = enter.append("rect");
        r.append("title");
        return r;
      })
      .attr("x", (d) => x(d.hour))
      .attr("y", 10)
      .attr("width", Math.max(1, x(1) - x(0)))
      .attr("height", 112)
      .attr("fill", "transparent")
      .select("title")
      .text((d) => `${hourLabel(d.hour)} · ${d.trips.toLocaleString()} trips`);
    const b = d3
      .brushX()
      .extent([
        [50, 7],
        [width - 20, 123],
      ])
      .on("end", (e: d3.D3BrushEvent<unknown>) => {
        if (!e.sourceEvent) return;
        const selection = e.selection as [number, number] | null;
        if (!selection) {
          onRange([0, 24]);
          return;
        }
        let start = Math.max(
          0,
          Math.min(23, Math.round(x.invert(selection[0]))),
        );
        const end = Math.min(
          24,
          Math.max(start + 1, Math.round(x.invert(selection[1]))),
        );
        onRange([start, end]);
      });
    svg
      .select<SVGGElement>(".brush")
      .on("mousemove.tooltip", (e) => {
        const [px] = d3.pointer(e, svgRef.current);
        const hour = Math.max(0, Math.min(23, Math.floor(x.invert(px))));
        tip.show(
          e,
          `${hourLabel(hour)}–${hourLabel(hour + 1)}`,
          `${hours[hour].trips.toLocaleString()} trips · full-day context`,
        );
      })
      .on("mouseleave.tooltip", tip.hide);
    brushRef.current = b;
    svg
      .select<SVGGElement>(".brush")
      .call(b)
      .call(b.move, [x(rangeRef.current[0]), x(rangeRef.current[1])] as [
        number,
        number,
      ]);
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [hours, width, onRange, tip.show, tip.hide]);
  useEffect(() => {
    if (brushRef.current) {
      const x = d3
        .scaleLinear()
        .domain([0, 24])
        .range([50, width - 20]);
      d3.select(svgRef.current!)
        .select<SVGGElement>(".brush")
        .call(brushRef.current.move, [x(range[0]), x(range[1])] as [
          number,
          number,
        ]);
    }
  }, [range, width]);
  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <div className="inline-heading">
          <span className="eyebrow">03 / DAILY RHYTHM</span>
          <h2>The pulse of the city</h2>
        </div>
        <span className="chart-note">
          Drag to select a time window{" "}
          <span className="range-label">
            {hourLabel(range[0])} — {hourLabel(range[1])}
          </span>
        </span>
      </div>
      <div ref={ref}>
        <svg
          ref={svgRef}
          width="100%"
          height="155"
          aria-label="24 hour activity timeline. Use time controls for keyboard selection."
        >
          <g className="y-axis" />
          <g className="x-axis" />
          <path className="activity-area" fill="#b5e88b" fillOpacity=".1" />
          <path
            className="activity-line"
            fill="none"
            stroke="#b5e88b"
            strokeWidth="2"
          />
          <g className="hour-hits" />
          <g className="brush" />
        </svg>
      </div>
      {tip.element}
    </section>
  );
});
