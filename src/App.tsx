import { useCallback, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Compass, Layers3 } from "lucide-react";
import { records } from "./data/generate";
import {
  defaultFilters,
  filterRecords,
  getRoutes,
  getDistrictStats,
  getHours,
  getHeatmap,
  hourLabel,
} from "./utils/aggregate";
import { type Filters as FilterState, type Mode } from "./types";
import Filters from "./components/Filters/Filters";
import KPI from "./components/KPI/KPI";
import FlowMap from "./components/FlowMap/FlowMap";
import SankeyDiagram from "./components/SankeyDiagram/SankeyDiagram";
import Timeline from "./components/Timeline/Timeline";
import CongestionHeatmap from "./components/CongestionHeatmap/CongestionHeatmap";
import RankingChart from "./components/RankingChart/RankingChart";
export default function App() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [tab, setTab] = useState<"explorer" | "study">("explorer");
  const patch = useCallback(
    (update: Partial<FilterState>) => setFilters((f) => ({ ...f, ...update })),
    [],
  );
  const reset = useCallback(
    () => setFilters({ ...defaultFilters, modes: [...defaultFilters.modes] }),
    [],
  );
  const selectDistrict = useCallback(
    (id: string) =>
      setFilters((f) => ({
        ...f,
        district: f.district === id ? "" : id,
        direction: "both",
      })),
    [],
  );
  const selectNode = useCallback(
    (kind: "origin" | "destination" | "mode", key: string) =>
      setFilters((f) =>
        kind === "mode"
          ? { ...f, modes: [key as Mode] }
          : { ...f, [kind]: f[kind] === key ? "" : key },
      ),
    [],
  );
  const selectCell = useCallback(
    (id: string, hour: number) =>
      patch({ district: id, hours: [hour, hour + 1] }),
    [patch],
  );
  const selectRange = useCallback(
    (hours: [number, number]) => patch({ hours }),
    [patch],
  );
  const selectDirection = useCallback(
    (direction: FilterState["direction"]) => patch({ direction }),
    [patch],
  );
  const contextRows = useMemo(
    () => filterRecords(records, filters, false),
    [
      filters.dayType,
      filters.modes,
      filters.origin,
      filters.destination,
      filters.district,
      filters.direction,
    ],
  );
  const rows = useMemo(
    () =>
      contextRows.filter(
        (r) => r.hour >= filters.hours[0] && r.hour < filters.hours[1],
      ),
    [contextRows, filters.hours],
  );
  const routes = useMemo(() => getRoutes(rows), [rows]);
  const stats = useMemo(() => getDistrictStats(rows), [rows]);
  const hours = useMemo(() => getHours(contextRows), [contextRows]);
  const heatmap = useMemo(() => getHeatmap(contextRows), [contextRows]);
  const exportData = () => {
    const fields = [
      "origin",
      "destination",
      "trips",
      "mode",
      "travelTime",
      "distance",
      "hour",
      "dayType",
      "congestion",
    ] as const;
    const csv = [
      fields.join(","),
      ...rows.map((r) => fields.map((k) => r[k]).join(",")),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "meridian-filtered-trips.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to dashboard
      </a>
      <header className="app-header">
        <a
          href="#"
          className="brand"
          aria-label="Meridian home"
          onClick={() => setTab("explorer")}
        >
          <span className="brand-mark">
            <svg viewBox="0 0 32 32">
              <path d="M5 25V7l11 12L27 7v18" />
            </svg>
          </span>
          MERIDIAN
          <span className="brand-divider" />
          <span className="brand-description">URBAN INTELLIGENCE</span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={tab === "explorer" ? "active" : ""}
            onClick={() => setTab("explorer")}
          >
            Flow explorer
          </button>
          <button
            className={tab === "study" ? "active" : ""}
            onClick={() => setTab("study")}
          >
            Case study <ArrowUpRight size={13} />
          </button>
        </nav>
        <span className="dataset-badge">
          <i />
          SIMULATED DATA
        </span>
      </header>
      <main id="main">
        <div className="page-heading">
          <div>
            <div className="breadcrumb">
              <Compass size={13} /> MERIDIAN METROPOLITAN AREA <span>/</span>{" "}
              MOBILITY OBSERVATORY
            </div>
            <h1>
              {tab === "explorer"
                ? "A city in motion."
                : "Behind the movement."}
            </h1>
            <p>
              {tab === "explorer"
                ? "Explore the daily rhythms, connections, and pressure points of urban travel."
                : "The data, interaction design, and engineering behind Meridian."}
            </p>
          </div>
          {tab === "explorer" && (
            <button className="export-button" onClick={exportData}>
              <ArrowDownToLine size={15} />
              Export selection
            </button>
          )}
        </div>
        {tab === "explorer" ? (
          <>
            <Filters filters={filters} onChange={patch} onReset={reset} />
            <KPI rows={rows} stats={stats} routes={routes} />
            <div className="workspace-caption">
              <span>
                <Layers3 size={13} /> CITY NETWORK <b>20 DISTRICTS</b>
              </span>
              <span>
                {filters.dayType.toUpperCase()}{" "}
                <span className="caption-separator">/</span>{" "}
                {hourLabel(filters.hours[0])}–{hourLabel(filters.hours[1])}{" "}
                <span className="caption-separator">/</span>{" "}
                {rows.length.toLocaleString()} RECORDS
              </span>
            </div>
            <div className="top-grid">
              <FlowMap
                routes={routes}
                stats={stats}
                filters={filters}
                onDistrict={selectDistrict}
                onDirection={selectDirection}
              />
              <SankeyDiagram rows={rows} onSelect={selectNode} />
            </div>
            <Timeline
              hours={hours}
              range={filters.hours}
              onRange={selectRange}
            />
            <div className="bottom-grid">
              <CongestionHeatmap
                cells={heatmap}
                range={filters.hours}
                selected={filters.district}
                onSelect={selectCell}
              />
              <RankingChart stats={stats} onDistrict={selectDistrict} />
            </div>
          </>
        ) : (
          <CaseStudy />
        )}
        <footer>
          <span>
            MERIDIAN{" "}
            <span className="footer-muted">/ An urban mobility case study</span>
          </span>
          <span>
            React + TypeScript + D3.js{" "}
            <span className="caption-separator">/</span> Fictional city.
            Reproducible data.
          </span>
        </footer>
      </main>
    </>
  );
}
function CaseStudy() {
  return (
    <article className="case-study">
      <div className="study-lead">
        <span className="eyebrow">ENGINEERING CASE STUDY / 001</span>
        <h2>
          From isolated journeys
          <br />
          to a connected city.
        </h2>
        <p>
          A district can appear quiet in an all-day average while acting as a
          severe morning bottleneck. Meridian makes those relationships visible
          by connecting geography, flow composition, time, and congestion in one
          exploration state.
        </p>
        <a href={`${import.meta.env.BASE_URL}CASE_STUDY.md`} download>
          Download the complete case study <ArrowDownToLine size={15} />
        </a>
      </div>
      <div className="study-sections">
        <section>
          <h3>The question</h3>
          <p>
            How does movement across the city change throughout the day, and
            where are the major transportation bottlenecks? The audience is a
            transport analyst comparing travel demand, mode share, and district
            pressure.
          </p>
        </section>
        <section>
          <h3>Why D3?</h3>
          <p>
            The city map uses a Voronoi partition, directional quadratic paths,
            volume scales, and bounded zoom. A three-stage Sankey shares filters
            with a brushable timeline and district heatmap. D3 gives each view
            its own geometry while letting it participate in the same
            interaction system.
          </p>
        </section>
        <section>
          <h3>One state, five perspectives</h3>
          <p>
            React owns filters, layout, and data selection. D3 owns each SVG
            plotting layer: keyed joins, scales, Sankey layout, zoom, brush, and
            transitions. The timeline and heatmap keep full-day context while
            the map, flow diagram, ranking, and KPIs reflect the selected
            window.
          </p>
        </section>
        <section>
          <h3>A transparent simulation</h3>
          <p>
            Twenty districts represent residential, employment, and leisure
            destinations. A seeded generator produces
            origin–destination–mode–hour records for a representative weekday
            and weekend day. All averages are weighted by trips. Congestion is a
            synthetic 0–1 index, not a measured road capacity or a real-world
            estimate.
          </p>
        </section>
        <section>
          <h3>Reading the system</h3>
          <p>
            Select a district on the map, choose incoming or outgoing travel,
            then brush a time window. Follow transportation modes in the Sankey.
            Use the heatmap to inspect an hour and the rankings to identify
            districts worth investigating. Reset returns to the weekday morning
            window.
          </p>
        </section>
        <section>
          <h3>Engineering decisions</h3>
          <p>
            Map routes are limited to the 60 largest connections, with their
            share of trips disclosed. The other views include every matching
            record. The complete documentation includes measured findings,
            performance results, data limitations, and the path from SVG to
            Canvas or WebGL.
          </p>
          <a href={`${import.meta.env.BASE_URL}CASE_STUDY.md`} download>
            Read the complete analysis <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
    </article>
  );
}
