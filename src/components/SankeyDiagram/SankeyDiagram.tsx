import { memo, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  sankey,
  sankeyLinkHorizontal,
  type SankeyNode,
  type SankeyLink,
} from "d3-sankey";
import { MODES, type Mode, type TripRecord } from "../../types";
import { districtName } from "../../data/districts";
import { modeColor, duration } from "../../scales";
import { compact } from "../../utils/aggregate";
import { useElementSize } from "../../hooks/useElementSize";
import { useTooltip } from "../../hooks/useTooltip";
interface NodeData {
  id: string;
  name: string;
  kind: "origin" | "mode" | "destination";
  key: string;
}
interface LinkData {
  color: string;
  id: string;
}
type N = SankeyNode<NodeData, LinkData>;
type L = SankeyLink<NodeData, LinkData>;
export default memo(function SankeyDiagram({
  rows,
  onSelect,
}: {
  rows: TripRecord[];
  onSelect: (kind: NodeData["kind"], key: string) => void;
}) {
  const { ref, width } = useElementSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const tip = useTooltip();
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    const nodes: NodeData[] = [];
    const links: (LinkData & {
      source: string;
      target: string;
      value: number;
    })[] = [];
    const origins = d3.rollups(
        rows,
        (v) => d3.sum(v, (r) => r.trips),
        (r) => r.origin,
        (r) => r.mode,
      ),
      destinations = d3.rollups(
        rows,
        (v) => d3.sum(v, (r) => r.trips),
        (r) => r.destination,
        (r) => r.mode,
      );
    origins.forEach(([id]) =>
      nodes.push({
        id: `o-${id}`,
        name: districtName(id),
        kind: "origin",
        key: id,
      }),
    );
    MODES.filter((mode) => rows.some((r) => r.mode === mode)).forEach((mode) =>
      nodes.push({ id: `m-${mode}`, name: mode, kind: "mode", key: mode }),
    );
    destinations.forEach(([id]) =>
      nodes.push({
        id: `d-${id}`,
        name: districtName(id),
        kind: "destination",
        key: id,
      }),
    );
    for (const [id, modes] of origins)
      for (const [mode, value] of modes)
        links.push({
          id: `o-${id}-${mode}`,
          source: `o-${id}`,
          target: `m-${mode}`,
          value,
          color: modeColor[mode],
        });
    for (const [id, modes] of destinations)
      for (const [mode, value] of modes)
        links.push({
          id: `d-${id}-${mode}`,
          source: `m-${mode}`,
          target: `d-${id}`,
          value,
          color: modeColor[mode],
        });
    if (!links.length) {
      svg.selectAll("*").remove();
      return;
    }
    const graph = sankey<NodeData, LinkData>()
      .nodeId((d) => d.id)
      .nodeWidth(6)
      .nodePadding(10)
      .nodeSort((a, b) => d3.ascending(a.name, b.name))
      .extent([
        [96, 18],
        [width - 96, 485],
      ])({ nodes, links });
    const path = sankeyLinkHorizontal<NodeData, LinkData>();
    const linkSelection = svg
      .selectAll<SVGPathElement, L>(".sankey-link")
      .data(graph.links, (d) => d.id)
      .join(
        (enter) =>
          enter.append("path").attr("class", "sankey-link").attr("opacity", 0),
        (update) => update,
        (exit) =>
          exit.transition().duration(duration()).attr("opacity", 0).remove(),
      )
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .on("mousemove", function (e, d) {
        linkSelection.attr("opacity", (l) => (l.id === d.id ? 0.85 : 0.09));
        nodeSelection.attr("opacity", (n) =>
          n.id === (d.source as N).id || n.id === (d.target as N).id ? 1 : 0.25,
        );
        tip.show(
          e,
          `${(d.source as N).name} → ${(d.target as N).name}`,
          `${compact(d.value)} trips · click a node to filter`,
        );
      })
      .on("mouseleave", () => {
        linkSelection.attr("opacity", 0.28);
        nodeSelection.attr("opacity", 1);
        tip.hide();
      });
    linkSelection
      .transition()
      .duration(duration())
      .attr("d", path)
      .attr("stroke-width", (d) => Math.max(0.6, d.width ?? 0))
      .attr("opacity", 0.28);
    const nodeSelection = svg
      .selectAll<SVGGElement, N>(".sankey-node")
      .data(graph.nodes, (d) => d.id)
      .join(
        (enter) => {
          const g = enter.append("g").attr("class", "sankey-node");
          g.append("rect");
          g.append("text");
          return g;
        },
        (update) => update,
        (exit) => exit.remove(),
      )
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `Filter ${d.kind}: ${d.name}`)
      .on("click", (_, d) => onSelect(d.kind, d.key))
      .on("keydown", (e, d) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(d.kind, d.key);
        }
      })
      .on("mousemove", (e, d) => {
        const connected = new Set<string>([d.id]);
        graph.links.forEach((l) => {
          if ((l.source as N).id === d.id || (l.target as N).id === d.id) {
            connected.add((l.source as N).id);
            connected.add((l.target as N).id);
          }
        });
        nodeSelection.attr("opacity", (n) => (connected.has(n.id) ? 1 : 0.2));
        linkSelection.attr("opacity", (l) =>
          (l.source as N).id === d.id || (l.target as N).id === d.id
            ? 0.8
            : 0.06,
        );
        tip.show(e, d.name, `${compact(d.value ?? 0)} trips · ${d.kind}`);
      })
      .on("mouseleave", () => {
        nodeSelection.attr("opacity", 1);
        linkSelection.attr("opacity", 0.28);
        tip.hide();
      });
    nodeSelection
      .select("rect")
      .attr("fill", (d) =>
        d.kind === "mode" ? modeColor[d.key as Mode] : "#91a7a6",
      )
      .transition()
      .duration(duration())
      .attr("x", (d) => d.x0!)
      .attr("y", (d) => d.y0!)
      .attr("width", (d) => d.x1! - d.x0!)
      .attr("height", (d) => Math.max(1, d.y1! - d.y0!));
    nodeSelection
      .select("text")
      .text((d) => d.name)
      .attr("fill", (d) =>
        d.kind === "mode" ? modeColor[d.key as Mode] : "#a9b6b7",
      )
      .attr("font-size", 11)
      .attr("font-weight", (d) => (d.kind === "mode" ? 600 : 400))
      .attr("text-anchor", (d) =>
        d.kind === "origin"
          ? "end"
          : d.kind === "destination"
            ? "start"
            : "middle",
      )
      .transition()
      .duration(duration())
      .attr("x", (d) =>
        d.kind === "origin"
          ? d.x0! - 8
          : d.kind === "destination"
            ? d.x1! + 8
            : (d.x0! + d.x1!) / 2,
      )
      .attr("y", (d) =>
        d.kind === "mode" ? d.y0! - 6 : (d.y0! + d.y1!) / 2 + 4,
      );
    return () => {
      svg.selectAll("*").interrupt();
    };
  }, [rows, width, onSelect, tip.show, tip.hide]);
  return (
    <section className="panel sankey-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">02 / FLOW COMPOSITION</span>
          <h2>Every journey, connected</h2>
        </div>
        <span
          className="info-mark"
          title="All matching trips are included. Flows aggregate at transportation modes; hover to inspect a stage."
        >
          i
        </span>
      </div>
      <div className="sankey-columns">
        <span>ORIGIN</span>
        <span>MODE</span>
        <span>DESTINATION</span>
      </div>
      <div ref={ref} className="sankey-chart">
        {!rows.length && (
          <div className="empty-chart">No journeys match these filters.</div>
        )}
        <svg
          ref={svgRef}
          width="100%"
          height="500"
          aria-label="Origin to mode to destination Sankey flow diagram"
        />
      </div>
      <div className="chart-note">
        Trace a flow. Select any node to narrow the city.
      </div>
      {tip.element}
    </section>
  );
});
