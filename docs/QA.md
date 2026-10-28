# Verification record

Verified locally on 2026-09-14, with finishing checks on 2026-09-16 with Node 22.22.3 and the Codex in-app browser. Results describe this implementation and these checks; they are not a claim of broad cross-browser certification.

## Build and data checks

- `npm run build`: strict TypeScript compilation and optimized Vite bundle pass.
- `npm test`: four test groups pass, including every generated record's constraints, deterministic generation, unique grouping keys, intersecting filters, incoming travel, half-open hourly bounds, empty mode selection, weighted averages, and conservation across all aggregate types.
- `npm run analyze`: 60,725 records; 481,162 weekday trips; 233,851 weekend trips; findings saved in `analysis.json`.
- Consistent source formatting using Prettier.

## Browser behavior verified

| Action                                       | Observed result                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| Initial weekday 07:00–10:00                  | 115.0k trips, 31.7-minute mean; 20 districts and 60 top routes                 |
| Keyboard-select Central map district         | 18.4k trips touching Central; selection indicator appears                      |
| Choose Incoming                              | 14.5k trips; Sankey has one destination node                                   |
| Keyboard-select Car Sankey node              | 4.0k trips; only Car active, 100% leading-mode share                           |
| Weekend, full day                            | 233.9k trips; ranking begins with Arts District when Most arrivals is selected |
| Turn off all four modes                      | Zero trips and explicit map/Sankey empty states; no invalid numeric KPIs       |
| Reset from empty                             | Initial 115.0k trip selection restored                                         |
| Drag timeline brush to 16:00–19:00           | Both selects and label synchronize; 119.7k evening trips                       |
| Map zoom and reset view                      | Camera transform changes and returns independently of filters                  |
| Keyboard-select Central's 08:00 heatmap cell | Central focus and 08:00–09:00 range selected                                   |
| Ranking settles after rapid filtering        | Exactly eight keyed district rows remain                                       |
| Route join settles after rapid filtering     | Exactly 60 route strokes remain on desktop                                     |

## Visual checks

- Desktop: map and Sankey align; timeline and lower charts render with readable labels and no clipping.
- Mobile at 390 × 844: filters and KPIs reorganize; page content width equals viewport width (390 pixels), with no horizontal overflow. Map uses fewer routes and selected/major district labels to reduce crowding. Sankey retains all matching districts.
- Tablet at 820 × 1180: the two primary plots stack at 776 pixels wide; page width remains exactly 820 pixels.
- The in-app case study navigation opens its content and document download link.
- Initial exploration checks had no browser warnings or errors. A transient React hook error appeared during dependency replacement and hot reload; a full reload after dependency installation restored a clean session, with no new warnings or errors during final mobile selection and reset checks.

## Scope

Manual browser checks use the rendered application, not mocked state. Touch-device hardware, screen reader behavior, Safari/Firefox coverage, and real-world data validity were not independently audited. Reduced-motion CSS and zero-duration D3 transitions are implemented; no simulated vehicle movement is required to understand route direction because static arrowheads remain visible.
