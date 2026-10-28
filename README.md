# MERIDIAN

### Interactive Urban Mobility Flow Explorer

A coordinated React + TypeScript + D3 application for exploring the rhythms, routes, and bottlenecks of a fictional metropolitan city. Twenty districts and **60,725 reproducible aggregate records** power five linked visualizations. This is a working analytical product and senior front-end/data-visualization case study, not a static chart gallery.

> **Screenshot placeholder:** add a full desktop capture to `docs/screenshot.png` for your portfolio or repository cover. The running application is the source of truth.

## The problem

**How does movement across the city change throughout the day, and where are the major transportation bottlenecks?** Geography, time, mode, and direction need to be explored together. Meridian makes those relationships visible through a single coordinated filtering model.

## Features

- Selectable schematic districts, curved directed flows, route/district tooltips, bounded zoom and pan.
- Origin → mode → destination Sankey with connected-node highlighting and node filters.
- Full-day timeline with an hour-snapping brush and keyboard-accessible start/end controls.
- District × hour congestion heatmap; select a cell to investigate its district and hour.
- Animated top-eight rankings for departures, arrivals, congestion, and mean travel time.
- Five responsive KPIs, trip-weighted averages, and CSV export of filtered source records.
- Global day, time, mode, origin, destination, district, and direction filters.
- Responsive desktop/tablet/mobile layouts, focus styling, and reduced-motion support.
- In-app case study, complete engineering report, reproducible findings, and data tests.

## Start locally

Requires Node.js 22+ and npm.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). No API key, database, or external data service is required. Optional Google Fonts requests fall back to system fonts when offline.

```bash
npm run build       # Strict TypeScript check + optimized production bundle
npm run preview     # Serve the production build locally
npm test            # Data integrity, filtering, and aggregation tests
npm run analyze     # Reproduce findings and write docs/analysis.json
npm run format      # Format project source and documentation
npm run format:check
```

Production files are written to `dist/` and can be served by any static host. The application has no backend. The included Vite development server is for local development, not a production service.

## GitHub Pages deployment

The production target is [risangdevs.github.io/meridian](https://risangdevs.github.io/meridian/).

`.github/workflows/deploy.yml` installs locked dependencies, runs the data tests, builds the site, and deploys `dist/` whenever `main` is pushed. It can also be started manually in the repository's Actions tab. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.

Production builds use `/meridian/` as their Vite base path. Local development remains at `/`. Case-study downloads use Vite's base URL so they work under the repository subdirectory. To inspect the deployment locally:

```bash
npm run build
npm run preview
# Open http://localhost:4173/meridian/
```

For a different repository name or a custom domain, update the production `base` in `vite.config.ts` before deploying.

## Interaction guide

1. Start with the default weekday 07:00–10:00 window.
2. Click **Central** on the map; every focus view now uses trips touching Central.
3. Select **Incoming** or **Outgoing** below the map.
4. Click a Sankey mode node, or use the mode toggles to compare a combination.
5. Brush the timeline to compare morning and evening; the time selects provide an exact alternative.
6. Select a heatmap cell to inspect a district/hour, or choose a ranking metric and click a district.
7. Use the origin and destination selects to isolate a specific corridor.
8. Export the matching aggregate records or reset to the default view.

Map: drag to pan, Ctrl/Command + scroll to zoom, or use the plus/minus controls. Reset map view restores the camera only. All filters intersect; incompatible choices or no selected modes produce a deliberate empty state. Re-select a chosen map district to clear its focus. **Reset** clears global filters and restores the morning window.

## Visualization architecture

```
React filter state
        │
        ▼
Non-time selection ──────────────► 24-hour timeline + heatmap context
        │                                   │
        ▼                                   │ brush / cell selection
Time-window selection ◄─────────────────────┘
        │
        ├── KPIs
        ├── Geographic flow map
        ├── Origin → mode → destination Sankey
        ├── District ranking
        └── CSV export
```

React owns state, controls, layout, and SVG roots. D3 owns dedicated chart descendants: scales, aggregation, geometry, layout, keyed joins, transitions, zoom, and brush. Stable callbacks and memoized derivations avoid unnecessary chart work. `ResizeObserver` follows each plot container.

The timeline and heatmap preserve **full-day context** under the non-time filters. Selected hours remain highlighted. All focus views use the exact selected time window. The map shows the top 60 matching routes (30 on narrow maps) and reports their share of trips; Sankey, ranking calculations, and KPIs use all matching records.

## Technology

React 19 · TypeScript 5.7 · D3 7 · d3-sankey · Vite 6 · Lucide icons · Node's test runner via tsx · Prettier. No Chart.js, Recharts, Highcharts, or other chart wrappers.

## Project structure

```
src/
  components/
    FlowMap/             # Voronoi areas, directed geometry, zoom
    SankeyDiagram/       # Three-stage flow layout and highlighting
    Timeline/            # Daily area curve and snapping brush
    CongestionHeatmap/   # District/hour grid and selection
    RankingChart/        # Keyed animated rankings
    KPI/                 # Reactive summary values
    Filters/             # Global analytical controls
  data/
    districts.ts         # Fictional district roles and coordinates
    generate.ts          # Seeded deterministic simulation
  hooks/                 # Container measurement and tooltip positioning
  scales/                # Shared color encodings and motion preference
  types/                 # Domain types
  utils/aggregate.ts     # Pure filtering and aggregation
  App.tsx                # Coordinated state and layout
  styles.css             # Responsive visual system
scripts/analyze.ts       # Findings and aggregation benchmark
tests/data.test.ts       # Meaningful data and selector invariants
docs/CASE_STUDY.md        # Full engineering case study
docs/analysis.json        # Computed findings and timings
docs/QA.md               # Browser verification record
public/CASE_STUDY.md      # Downloadable copy served by Vite
```

## Dataset

Seed `271828` produces 60,725 nonzero groups over 20 districts, four modes, 24 hours, and two representative day types. Each group contains origin, destination, trips, mode, mean travel time (minutes), schematic distance (km), hour, day type, and a synthetic congestion index (0–1). Self-trips are excluded.

Demand reflects district roles, commute peaks, leisure travel, distance decay, mode affinity, and a simplified river-crossing penalty. Generated records represent **481,162 weekday trips** and **233,851 weekend trips**. These are synthetic examples, not observations or transport forecasts. The generator runs once and the data can be inspected/exported directly.

All travel-time and congestion averages are trip-weighted. Time uses `[start, end)` intervals. District incident statistics count a trip at both endpoints; departures and arrivals each independently sum to the global total. Sankey bands aggregate at modes and do not retain a complete individual route lineage through those shared nodes.

## Performance considerations

The number of rendered marks is bounded even when the dataset has tens of thousands of records. The initial 30-run Node benchmark measured approximately 2.9 ms median and 5.6 ms p95 for filtering plus all aggregate computations. It excludes browser rendering; actual timings vary by machine. The initial production JavaScript bundle was approximately 119 kB gzip.

SVG is a suitable renderer for 20 districts, 60 visible map routes, up to 44 Sankey nodes, and 480 heatmap cells. Larger raw datasets need worker/server aggregation and indexing. Thousands of visible moving marks favor Canvas or WebGL, with SVG or HTML retained for accessible controls and labels. See the case study for tradeoffs and benchmark scope.

## Findings and engineering report

[Read the complete case study](docs/CASE_STUDY.md) for the problem, D3 rationale, data model, visualization choices, information architecture, interaction design, React/D3 responsibilities, engineering challenges, seven measured findings, performance, limitations, and lessons learned.

[Inspect the reproducible analysis](docs/analysis.json) or run `npm run analyze`. If changing the written report, update its public copy so the in-app download stays current:

```bash
cp docs/CASE_STUDY.md public/CASE_STUDY.md
```

## Future improvements

- Side-by-side comparison of day types and time windows.
- Accessible table equivalents and a full assistive-technology audit.
- Shareable URL filter state and saved analytical views.
- Worker-based aggregation, indexed data, and streamed real datasets.
- Geographic boundaries, real transit networks, and calibrated congestion measures.
- Canvas/WebGL rendering only when visible mark count justifies it.
