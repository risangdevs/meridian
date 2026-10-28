# Meridian: Interactive Urban Mobility Flow Explorer

**An engineering case study in coordinated data visualization**

React · TypeScript · D3 · Vite

Dataset seed: `271828` · 20 fictional districts · 60,725 aggregate records

## Problem

A city's movement cannot be understood from a single measure. A busy residential district may originate trips in the morning and receive them in the evening. High volume does not necessarily imply high congestion: a metro corridor can carry many travelers without the same delays as a road corridor.

Meridian supports a transport analyst asking: **How does movement across the city change throughout the day, and where are the major transportation bottlenecks?** It connects location, direction, transportation mode, time, and travel conditions. The product opens on a representative weekday between 07:00 and 10:00, an informative starting point that can immediately be changed.

Success means an analyst can discover a district, examine its connections, isolate an incoming or outgoing mode, compare time windows, and understand which filters produced each result. This is a simulation for demonstrating an analytical workflow, not a decision system for a real transport authority.

## Why D3.js?

Each chart has a different geometry and interaction model. The schematic map combines a Voronoi district partition with directed quadratic Bézier routes, volume-scaled strokes, bounded zoom, and contextual district selection. A three-stage Sankey needs a graph layout, custom node identities, link highlighting, and transitions. The timeline needs a continuous interaction translated into discrete hourly filters. Rankings require keyed objects that move between positions without losing identity.

A conventional chart wrapper could supply some individual charts. It would be restrictive where custom geometry, cross-chart selection semantics, and animation lifecycles meet. D3 supplies composable primitives instead of making the entire application conform to a fixed chart vocabulary.

Specific primitives used include `Delaunay`, `scaleLinear`, `scaleSqrt`, `scaleBand`, `rollups`, `sum`, `area`, `line`, `curveMonotoneX`, `zoom`, `brushX`, keyed selection joins, transitions, and `d3-sankey`. No conventional chart library is used.

## Data and preprocessing

### Unit of observation

A record is an aggregate of trips with the same origin, destination, mode, hour, and day type. It is not one person's journey. The two day types describe one representative weekday and one representative weekend day; they are not five weekdays plus two weekend days.

| Field                   | Meaning                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `origin`, `destination` | Stable district IDs; self-trips are excluded               |
| `trips`                 | Positive integer number of journeys in the group           |
| `mode`                  | Metro, Bus, Car, or Bike                                   |
| `travelTime`            | Mean minutes per journey within the group                  |
| `distance`              | Schematic distance in kilometers                           |
| `hour`                  | Integer 0–23, representing the start of an hourly interval |
| `dayType`               | Weekday or Weekend                                         |
| `congestion`            | Synthetic severity index from 0 to 1                       |

`src/data/districts.ts` defines 20 district centers with relative residential, employment, and leisure weights. Coordinates occupy a local 900 × 570 schematic plane. They are neither latitude/longitude nor actual administrative boundaries. D3's Voronoi partition turns those centers into selectable areas.

`src/data/generate.ts` uses a seeded linear congruential generator and deterministic demand functions. Weekday demand combines a Gaussian morning commute centered at 08:00, an evening commute centered at 17:00, midday activity, and a low overnight baseline. Weekend demand favors leisure destinations and later travel. Distance discourages long trips; metro affinity increases beyond four kilometers, and cycling demand declines with distance. Trips rounded to zero are omitted. Airports and industrial zones are simplified district roles, not detailed aviation or freight simulations.

Road pressure increases during commute peaks, at employment destinations, and for crossings of the model's `x = 500` river-side divider. The displayed river is schematic: its curved path is not used for geometric crossing tests. Car and bus travel times respond strongly to pressure; metro and cycling respond less. Congestion is an index of modeled trip conditions, **not percent road utilization, delay probability, or independently observed infrastructure capacity**.

### Aggregation rules

All filters intersect. A selected district includes journeys touching either endpoint unless the user specifies incoming or outgoing travel. Explicit origin and destination filters further restrict that set. Time intervals are half-open: `[7, 10)` includes 07:00, 08:00, and 09:00.

Weighted means are calculated as:

```
average = Σ(record.trips × record.metric) / Σ(record.trips)
```

District congestion and travel time include all matching arrivals and departures touching that district. A trip contributes once to its origin and once to its destination for district statistics; therefore district incident totals sum to twice the global total. Departures alone and arrivals alone each conserve the global total. Zero-trip districts have no observed score and are excluded from rankings. Empty selections show zero trips and em dashes for unavailable KPIs.

The dataset is generated once at module initialization. Memoized selectors derive the filtered records and chart-specific aggregates; raw records are never mutated. Sankey layouts receive newly constructed graph objects because the layout algorithm mutates its input nodes and links.

## Visualization strategy

| View                               | Analytical purpose                             | Encoding and tradeoff                                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Geographic flow map                | Locate corridors and neighborhoods             | Stroke width scales with square root of trips; color is leading mode or trip-weighted congestion. Only the 60 largest matching routes (30 on narrow maps) are shown, with their coverage disclosed. |
| Origin → mode → destination Sankey | Compare mode composition and district roles    | Flow width is proportional to trips. All matching districts and modes are included; hovering emphasizes adjacent links and nodes.                                                                   |
| 24-hour timeline                   | Compare daily rhythms and select intervals     | A continuous area and line summarize discrete hourly totals at hour centers; the brush snaps to hour boundaries.                                                                                    |
| District × hour heatmap            | Reveal rush-hour bands and persistent pressure | Fixed 0–1 sequential color scale supports comparison between selections. Missing observations use a dark neutral fill.                                                                              |
| Animated district ranking          | Find high-volume or high-pressure districts    | Top eight districts, with departures, arrivals, congestion, and travel-time metrics. Absolute values accompany proportional bars.                                                                   |

The map is a geographic orientation device, not a road network routing engine. Reciprocal flows bend in opposite directions. Moving dashes on the 20 busiest visible routes indicate origin-to-destination direction; speed depends on average route travel time. They are not individual vehicles or a real-time simulation.

The Sankey conserves flow at transportation-mode nodes. Once flows meet a mode, their origin identity is aggregated. An origin-to-mode band followed by a mode-to-destination band must not be read as the same origin–destination cohort. Use explicit origin/destination filters or the map's route tooltip to investigate a particular pair.

## Information architecture

The hierarchy is global controls, responsive KPIs, the map and Sankey workspace, the temporal brush, then congestion and rankings. The visualizations occupy most of the analytical page. An in-app case study offers an introduction and a downloadable full report.

There are two deliberately different data scopes:

1. **Focus:** map, Sankey, KPIs, rankings, and CSV export reflect every active filter, including time.
2. **Context:** timeline and heatmap apply every non-time filter across the full day. The timeline's brush and the heatmap's dimming communicate the selected time window.

Removing unselected hours from the timeline would hide alternative peaks and make a brush selection a dead end. Keeping context supports the next analytical question without altering the meaning of the focus views.

## Interaction design

Select Central on the map to retain all journeys touching Central. Choose incoming travel to isolate arrivals. Choose Car in the Sankey to isolate that mode. Brush 07:00–10:00 and compare the resulting KPIs with 16:00–19:00. All these actions change the same application filter state.

- **District hover:** departures and arrivals for the active time window.
- **Route hover:** origin, destination, trips, mean travel time, and congestion.
- **Map selection:** toggle district focus without implicitly deleting origin/destination filters.
- **Zoom and pan:** drag to pan; use zoom buttons or Ctrl/Command + scroll. Bounded transforms preserve spatial orientation. Reset view restores the camera without resetting filters.
- **Sankey hover:** connected nodes and adjacent flows gain emphasis; unrelated paths recede. Node click filters its corresponding field.
- **Timeline brush:** commits a snapped hourly range on gesture completion, avoiding a full dashboard recomputation for every mouse movement. Start/end selects provide a keyboard alternative.
- **Heatmap click:** selects a district and a one-hour interval.
- **Ranking click:** toggles district focus. Changing the metric moves keyed district rows to their new ranks.
- **Mode toggles:** multiple modes can be selected; selecting none intentionally produces an empty state.
- **Reset:** restores the original weekday 07:00–10:00 exploration state.
- **Export:** downloads the actual matching aggregate records as CSV, preserving distance and all other source fields.

Filters, map districts, Sankey nodes, and ranking rows can be operated with a keyboard. Focus outlines and reduced-motion preferences are supported. Hover details supplement persistent labels and CSV values. Touch users can select districts and use native filter controls. Color legends, text values, and labels supplement visual encodings; this is not a claim of a complete accessibility audit.

## Technical architecture

React owns application state, global controls, layout, data generation lifecycle, memoization, and the SVG container elements. D3 owns only the dedicated plotting layers inside each container. React never reconciles those D3-owned descendants.

`App.tsx` provides stable callbacks through `useCallback`. Each visualization is memoized. `useElementSize` observes its container with `ResizeObserver`, so chart geometry follows actual container width rather than a presumed viewport. `useTooltip` supplies fixed, viewport-clamped tooltips, separate from the zoomed SVG coordinate system.

The map uses a fixed viewBox, preserving district geometry as its display size changes. Its camera group is distinct from the route/data layers; filter changes update the data layers while retaining the zoom transform. The timeline reinitializes its brush when dimensions or context data change, restoring the current selected range afterward. Programmatic brush movement does not dispatch another application update because events without `sourceEvent` are ignored.

Stable keys encode route origin/destination pairs, Sankey side and district/mode, district/hour heatmap cells, and ranking district IDs. Charts interrupt active transitions before processing new input or unmounting. This matters during rapid filtering and React StrictMode's development effect cycle.

## Engineering challenges

### Synchronizing five views

The dangerous bug is not an obvious exception; it is two plausible charts using different data. Pure selectors implement one documented filtering predicate. Tests verify conservation across routes, timelines, and district statistics, and explicitly test empty, directional, and intersecting selections.

### Animation without losing meaning

DOM identity follows the underlying district or route, never its current array index. Ranking rows move rather than becoming unrelated replacement bars. Sankey links interpolate to their new geometry. Map route widths and opacity change with filters. The timeline transitions its path as mode, day type, or geography changes. Durations become zero and route motion stops when reduced motion is requested.

### Responsive SVG

A fixed viewBox works well for a schematic map; it is less suitable for readable Sankey labels or a heatmap. Those plots measure their containers and recompute scales. Desktop uses paired map/Sankey and heatmap/ranking columns. Tablet stacks them when space becomes tight. Mobile wraps filters, restructures the KPI strip, and retains all plots in a single-column reading order. Narrow maps show 30 routes and larger labels for seven orientation districts plus the selected district; all districts remain selectable.

### Tooltips and zoom

Tooltip positions use client coordinates and viewport bounds rather than SVG coordinates. This avoids errors after zooming, scrolling, or changing layout. Pointer-transparent tooltip surfaces prevent feedback loops. Plot listeners are reassigned with current data, while camera listeners are initialized independently.

### Dense flows

Showing every possible directed route across 20 districts would mean 380 curves before separating modes. The map selects the largest 60 and publishes their coverage; selecting a district reduces the network naturally. The Sankey and KPIs retain the complete filtered dataset. This is a disclosed visual aggregation choice, not silent data loss.

## Findings from the generated dataset

The following results were computed by `npm run analyze` after implementing the generator. The machine-readable output is `docs/analysis.json`. These are properties of this deterministic simulation; they do not establish facts about real cities or validate the generator's causal assumptions.

### 1. Weekday movement has two distinct peaks

The representative weekday contains **481,162 trips**. The busiest hourly interval is **08:00–09:00, with 43,029 trips**; 17:00–18:00 follows at **42,650**. The three-hour evening window (16:00–19:00) contains **119,693** trips, versus **114,984** in the morning (07:00–10:00). The higher hourly morning peak does not imply the larger three-hour total.

Reproduce: select Weekday and the full day; compare the timeline's two peaks, then choose the two three-hour intervals.

### 2. Central reverses direction during the day

Central receives **14,542 arrivals** and originates **3,825 departures** in the morning, a net inflow of **10,717**. In the evening it originates **14,072 departures** and receives **4,804 arrivals**, a net outflow of **9,268**. A full-day district total would conceal this directional reversal.

Reproduce: select Central, switch incoming/outgoing, and compare morning and evening.

### 3. The Financial district is strongly commute-oriented

Financial receives **13,821 arrivals** against **2,700 departures** during the morning window. During the evening it originates **13,469 departures** against **3,116 arrivals**. The busiest morning route overall is **Greenfield → Financial, 1,386 trips**. The map locates the connection while the Sankey shows its mode composition after applying the pair's filters.

### 4. Weekends shift both timing and destinations

The representative weekend day contains **233,851 trips**, **51.4% fewer** than the weekday. Its peak shifts to **15:00–16:00, with 19,588 trips**. Arts District receives the most arrivals (**21,253**), followed by Old Town (**19,480**) and Riverside (**18,070**). Weekend demand is both smaller and differently distributed.

Reproduce: select Weekend, 00:00–24:00, and Most arrivals in the ranking.

### 5. Metro carries the largest share, while bus travel is slower

Metro accounts for **47.18%** of weekday trips, Car **27.58%**, Bus **23.34%**, and Bike **1.91%**. Trip-weighted average journey times are **20.88 minutes for Metro**, **30.15 for Car**, and **45.30 for Bus**. Different route distances and mode affinity contribute to these averages; they are not a controlled comparison of the same journeys.

Reproduce: choose the full weekday and isolate each mode. Export the selection to compare matching distances or district pairs.

### 6. Cross-river morning car journeys experience greater pressure

The morning's **13,564 cross-river car trips** have a weighted congestion index of **0.780**, compared with **0.665** for **18,007 same-side car trips**: a difference of about **11.5 percentage points**. The simulation explicitly includes a crossing penalty, so this result illustrates the intended bottleneck mechanism rather than discovering an independent causal effect.

### 7. Central's pressure persists beyond a single rush-hour snapshot

Across the whole weekday, Central has the highest incident trip-weighted congestion index (**0.447**), followed by Tech Quarter (**0.442**) and Financial (**0.438**). The heatmap can distinguish their persistent baseline from the narrower rush-hour bands. Overnight travel from 00:00–05:00 accounts for only **3.66%** of weekday trips, illustrating why time-specific inspection matters.

## Performance

A recorded Node 22.22.3 benchmark runs the full-data filter plus route, district, hourly, and heatmap aggregation 30 times over 60,725 input records. The initial measurement was **2.88 ms median and 5.57 ms p95**, on the development machine. This measures computation only; it excludes browser layout, painting, D3 transitions, font loading, and device variability. Re-running the analysis updates the machine-readable timings, so they will vary.

Production output at initial validation was about **370 kB JavaScript (119 kB gzip)** and **16 kB CSS (4 kB gzip)**. The dataset is generated rather than downloaded as a large JSON payload. Fonts have local fallbacks if the optional Google Fonts request cannot load.

Filtering is O(N) in input records. Most aggregation passes are O(M) in matching records; route ordering adds O(R log R), with at most 380 directed district pairs. The map renders at most 60 route strokes and 20 direction overlays; the heatmap contains 480 cells. The Sankey has at most 44 nodes and 160 links, irrespective of the input record count. SVG is appropriate because the rendered mark count remains small and DOM hit testing, focus, and transitions are useful.

At millions of records, generation and filtering should move to a Web Worker or server query, with indexed/columnar data, cached aggregates, and precomputed hourly cubes. At many thousands of simultaneously displayed routes or moving agents, Canvas should render the dense layer while SVG/HTML retain labels and controls. Hit testing then requires spatial indexes. WebGL becomes useful for very large animated particle systems or dense line workloads, with added GPU complexity and accessibility work. Record count and visible mark count are different scaling problems; changing the renderer alone does not solve slow data processing.

## Validation and limitations

- Strict TypeScript compilation and optimized Vite production build.
- Automated tests for deterministic generation, valid schema, unique records, filter intersections, hourly boundaries, weighted means, empty selections, and conservation of totals across visualizations.
- Browser verification checks are recorded in `docs/QA.md`.
- No real map tiles, real-time feed, calendar histories, transit timetables, road capacities, observed sampling uncertainty, or person-level journeys are claimed.
- Schematic distance and congestion are simplified; route strokes do not follow roads.
- The full-day context plots deliberately do not remove hours outside the focus window.
- Comparisons are exploratory. A mode change can alter the distribution of observed routes, so aggregate differences alone do not prove an operational intervention would work.

## Lessons learned

D3's value here is control over the whole visual system: data joins preserve identity, layouts reveal different relationships, and interactions reshape a shared analytical state. React supplies a maintainable application boundary without competing for ownership of individual SVG marks.

The most consequential design decisions are semantic: what a trip means, which filters intersect, whether a time plot preserves context, how a route subset is disclosed, and when an average is weighted. Polished geometry cannot compensate for inconsistent denominators.

A further iteration could add side-by-side day/time comparison, accessible tabular chart alternatives, URL-persisted exploration state, a Web Worker pipeline, and real geographic boundaries with a calibrated transport model. Those are extensions to a working coordinated explorer, not assumptions hidden inside this simulation.

## Technical references

- [D3 keyed data joins](https://d3js.org/d3-selection/joining)
- [D3 brush](https://d3js.org/d3-brush)
- [D3 zoom](https://d3js.org/d3-zoom)
- [D3 transitions](https://d3js.org/d3-transition)
- [d3-sankey reference and layout API](https://github.com/d3/d3-sankey)
