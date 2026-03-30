# qs-ext-echarts-stackedline

Qlik Sense visualization extension that renders stacked area/line charts using Apache ECharts v5.
Author: Christof Schwarz (data/bridge). MIT license.

## File map

| File | Role |
|---|---|
| `ext-echart-stackedline.qext` | Extension manifest (name, version, capability flags) |
| `ext-echart-stackedline.js` | Entry point — wires hypercube definition, paint(), resize() |
| `props.js` | Properties panel — all user-facing settings (ref names start with `p`) |
| `paint.js` | All rendering logic — data processing, ECharts config, HTML table |
| `moreFunctions.js` | Three pure utilities: interpolateColor, formatNumber, getContrastColor |
| `resize.js` | Calls .resize() on both chart instances on container resize |
| `cdnjs/echarts.min.js` | Bundled Apache ECharts v5 (no CDN dependency) |

## Module pattern

All files use RequireJS AMD (`define([...], function(...) { ... })`).
`paint.js` exports a single `async function ($element, layout, globalSettings)`.
`props.js` exports `{ section1(title, globalSettings), about(title, globalSettings) }`.

## Hypercube structure

- `row[0]` — Dimension 1: x-axis (e.g. month)
- `row[1]` — Dimension 2: stack dimension (e.g. country) — drives series, color, sort
- `row[2]` — Measure 1: main KPI value
- `row[3]` — Measure 2 (optional): cohort indicator (null/0 = default, 1 = orange alt, 2 = grey alt)

Max fetch: qWidth=4, qHeight=2500.

## Property naming convention

All custom props in `props.js` use `ref: "pCamelCase"` and are accessed in `paint.js` as `layout.pCamelCase`.

## Color / sort system

`totalVals` (sum per dim2) and `inCohort` (cohort per dim2) are computed from the main hypercube
using `calcSumLastEntries(matrix, lastEntries)` — no session object.

`layout.pColorMode`:
- `"total"` — sums across all x-axis entries (`lastEntries = xAxisLabels.length`)
- `"last"`  — sums across last `layout.pLastNEntries` x-axis entries only

Four color gradients (start→end): positives (cohort 0), negatives (cohort 0), alt1 (cohort 1), alt2 (cohort 2).
Color interpolation factor = `index / (count - 1)` within each group.

## Series split (+/-)

Each dim2 member creates TWO ECharts series (`name+`, `name-`) so positives stack upward and
negatives stack downward independently. `_nameForSorting` drives the stacking order.

## Three views (toggle button)

0 = stacked line chart (`echart1`), 1 = summary bar chart (`echart2`), 2 = HTML table.
State stored in `globalSettings[ownId].toggleView`.

## Things to watch out for

- `qSuppressZero` check at the top of paint() — extension refuses to render if zero suppression is on.
- `xAxisLabels` is built in the first pass over the matrix (before sorting/coloring), not in the main loop.
- The `+` series clamps values to `Math.max(value, 1e-6)` and `-` series to `Math.min(value, -1e-6)` to avoid ECharts stacking artifacts at zero.
- `props` (`app.getObjectProperties`) is still fetched even though the session object was removed — needed for the `qSuppressZero` check.
