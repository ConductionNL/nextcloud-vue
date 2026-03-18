# Design: unified-grid-widget-system

## Architecture Overview

The grid system has three layers:

```
┌─────────────────────────────────────────────────────┐
│  Page Components (CnDashboardPage, CnDetailPage)    │
│  ─ import gridLayout mixin for shared 12-col grid   │
│  ─ accept widgets[] + layout[] props                │
│  ─ render #widget-{id} scoped slots in grid cells   │
├─────────────────────────────────────────────────────┤
│  Widget Components (reusable, self-contained)       │
│  ─ CnKpiWidget (icon + value + label)               │
│  ─ CnInfoWidget (label:value grid from schema)      │
│  ─ CnTableWidget (wraps CnDataTable, dual source)   │
│  ─ CnChartWidget (pure CSS horizontal bars)         │
│  ─ CnWidgetRenderer (NC Dashboard API widgets)      │
├─────────────────────────────────────────────────────┤
│  Grid Engine (shared mixin)                         │
│  ─ 12-column CSS grid                               │
│  ─ sortedLayout computed (sort by gridY, gridX)     │
│  ─ widgetGridStyle(item) → grid-column placement    │
│  ─ Responsive: 6-col < 900px, 1-col < 600px        │
└─────────────────────────────────────────────────────┘
```

Both `CnDashboardPage` and `CnDetailPage` use the same grid mixin. Apps provide widget content via `#widget-{id}` slots — same pattern for both page types.

## Component API Design

### CnKpiWidget

```vue
<CnKpiWidget
  :value="1234"
  label="Open Cases"
  :icon="BriefcaseOutline"
  variant="primary"
  format="number" />
```

Props: `value` (String|Number), `label` (String), `icon` (Object — MDI component), `variant` (String: default|primary|success|warning|error), `format` (String: text|number|currency|percent), `locale` (String, default 'nl-NL'), `route` (Object — optional click navigation)

### CnInfoWidget

```vue
<CnInfoWidget
  :object="characterData"
  :schema="characterSchema"
  :include-fields="['name', 'type', 'description']"
  :columns="2" />
```

Props: `object` (Object) + `schema` (Object) for auto-generation, OR `fields` (Array of `{ label, value }`) for manual. `includeFields` / `excludeFields` (Arrays), `columns` (Number: 1|2|3, default 2)

### CnTableWidget

```vue
<!-- External data mode (detail pages) -->
<CnTableWidget
  title="Skills"
  :rows="skillsData"
  :columns="skillColumns"
  :limit="5"
  :view-all-route="{ name: 'Skills' }" />

<!-- Self-fetch mode (dashboards) -->
<CnTableWidget
  title="Recent Cases"
  register="9"
  schema-id="42"
  :fetch-params="{ _limit: 5, _order: { created: 'desc' } }" />
```

Props: `title` (String), `rows` (Array, default null — external mode when provided), `columns` (Array), `schema` (Object — for auto-columns), `register` (String), `schemaId` (String), `fetchParams` (Object), `limit` (Number, default 5), `viewAllRoute` (Object), `emptyText` (String), `rowClickRoute` (Function)

Detection: `rows !== null` → external mode. Otherwise self-fetch if `register` + `schemaId` provided.

### CnChartWidget

```vue
<CnChartWidget
  title="Cases by Status"
  :data="[
    { label: 'Open', value: 42, color: '#0082c9' },
    { label: 'Closed', value: 18, color: '#46ba61' },
  ]" />
```

Props: `data` (Array of `{ label, value, color? }`), `title` (String), `emptyText` (String)

Renders pure CSS horizontal bars — no external chart library.

### CnDetailPage Grid Mode

```vue
<CnDetailPage
  title="Gandalf"
  subtitle="Character"
  :layout="characterLayout"
  :widgets="characterWidgets"
  :back-route="{ name: 'Characters' }"
  sidebar>
  <template #widget-details="{ item }">
    <CnInfoWidget :object="data" :schema="schema" />
  </template>
  <template #widget-skills="{ item }">
    <CnTableWidget title="Skills" :rows="skills" />
  </template>
</CnDetailPage>
```

When `layout` prop is null (default), CnDetailPage renders the default slot in a vertical stack — zero breaking changes.

## File Structure

```
src/
  mixins/
    gridLayout.js              # NEW — shared 12-col grid mixin
  components/
    CnKpiWidget/
      CnKpiWidget.vue          # NEW
      index.js                 # NEW
    CnInfoWidget/
      CnInfoWidget.vue         # NEW
      index.js                 # NEW
    CnTableWidget/
      CnTableWidget.vue        # NEW
      index.js                 # NEW
    CnChartWidget/
      CnChartWidget.vue        # NEW
      index.js                 # NEW
    CnDashboardPage/
      CnDashboardPage.vue      # MODIFY — import gridLayout mixin
    CnDetailPage/
      CnDetailPage.vue         # MODIFY — add layout/widgets props
    index.js                   # MODIFY — add new exports
  index.js                     # MODIFY — add new exports
```

## Decisions

### 1. Mixin vs Renderless Component for Grid

**Decision:** Vue 2 mixin (`src/mixins/gridLayout.js`)

**Why:** Vue 2 doesn't support composables with template concerns. A mixin cleanly shares the computed property (`sortedLayout`), method (`widgetGridStyle`), and CSS class (`.cn-grid-layout`) between CnDashboardPage and CnDetailPage. A renderless component would add unnecessary wrapper DOM elements.

### 2. CnTableWidget Wraps CnDataTable

**Decision:** Composition — CnTableWidget renders CnDataTable internally, adding a card container, title header, loading state, and "View all" footer.

**Why:** CnDataTable handles sorting, selection, cell rendering. CnTableWidget adds the widget chrome (header, footer, self-fetch). No duplication — just a higher-level wrapper.

### 3. Pure CSS Charts (No Library)

**Decision:** CnChartWidget uses CSS width-based horizontal bars.

**Why:** The only chart pattern used across apps is horizontal status bars (Pipelinq, Procest). ApexCharts adds ~150KB. CSS bars are zero-dependency, match the existing patterns, and cover 90% of use cases. OpenConnector keeps its ApexCharts for time-series.

### 4. Backwards-Compatible Grid Opt-in

**Decision:** `layout` prop defaults to `null`. When null, CnDetailPage uses vertical stacking. When provided, switches to CSS grid.

**Why:** All existing detail pages continue working unchanged. Apps opt in one page at a time. No big-bang migration required.

## Trade-offs

| Decision | Trade-off | Mitigation |
|----------|-----------|------------|
| CSS-only charts | Limited chart types (no line, pie, area) | CnChartWidget handles bars; apps needing advanced charts use ApexCharts directly |
| Mixin pattern | Mixins can have naming conflicts | Use `cn_grid_` prefix for all mixin properties |
| Dual data sourcing | CnTableWidget has two modes (complexity) | Default to external mode (simpler); self-fetch is opt-in |
| No GridStack for detail pages | Detail pages can't be rearranged by users | Layout prop can be changed to user preference in future |

## Responsive Behavior

The grid mixin includes responsive breakpoints:
- **>= 900px**: 12 columns (default)
- **600-899px**: 6 columns (widgets wrap to next row)
- **< 600px**: 1 column (full-width stacking)

## Security Considerations

- CnTableWidget self-fetch mode uses the same `buildHeaders()` utility (OCS-APIREQUEST + requesttoken) as the store
- No new API endpoints — all data comes through existing OpenRegister API
- Widget content is rendered via Vue template binding (no v-html), preventing XSS

## NL Design System

All components use Nextcloud CSS variables only (`--color-primary-element`, `--color-border`, etc.). NL Design System theming is handled by the nldesign app which overrides these variables — no direct `--nldesign-*` references needed.

---

## Implementation Reality Analysis (Added 2026-03-16)

### Critical Conflict: GridStack vs CSS Grid

The spec's architecture diagram shows "Grid Engine (shared mixin) — 12-column CSS grid" extracted from CnDashboardPage. **This is incorrect.** The actual implementation:

- **CnDashboardPage** delegates all grid rendering to **CnDashboardGrid**
- **CnDashboardGrid** imports `GridStack` from the `gridstack` npm package (line 32: `import { GridStack } from 'gridstack'`)
- GridStack is a **JavaScript-driven layout engine** that uses absolute positioning (`position: absolute`, `top`, `left`, `width`, `height` in pixels) — it does NOT use CSS Grid at all
- GridStack provides drag-and-drop, resize handles, collision detection, and float mode — none of which are achievable with CSS Grid alone
- The grid items use GridStack-specific data attributes (`gs-x`, `gs-y`, `gs-w`, `gs-h`) and the library manages DOM positioning

**Consequence:** There is no CSS Grid code in CnDashboardPage to extract. The proposed mixin would be an entirely **new implementation** of a 12-column CSS Grid, not a refactoring.

**Recommended approach:**
1. Create the CSS Grid mixin (`gridLayout.js`) as a **new, separate layout engine** for static (non-draggable) grid layouts
2. Use it in CnDetailPage's grid mode (static layout, no drag-and-drop needed)
3. Do NOT refactor CnDashboardPage — it must keep GridStack for drag-and-drop editing
4. Accept that dashboard and detail page grids use **different engines** (GridStack vs CSS Grid) with the **same data format** (layout array with gridX/gridY/gridWidth/gridHeight)

**Impact on Task 1.2:** "Refactor CnDashboardPage to use gridLayout mixin" is not feasible. CnDashboardPage cannot switch from GridStack to CSS Grid without losing drag-and-drop. This task should be removed or changed to "Verify layout array format compatibility between GridStack and CSS Grid mixin."

### CnChartWidget Conflict: ApexCharts vs Pure CSS

The spec says CnChartWidget should use "pure CSS horizontal bar charts." The existing CnChartWidget:

- Is an **ApexCharts wrapper** (dynamically imports `vue-apexcharts`)
- Supports 6 chart types: area, line, bar, pie, donut, radialBar
- Has Nextcloud-themed defaults (color palette, font, grid styling)
- Uses graceful degradation (shows fallback if ApexCharts not installed)
- Is already used in OpenConnector for time-series charts

**Options:**
1. **Rename proposed component** to `CnBarChart` or `CnSimpleChart` — avoids collision, both components coexist
2. **Add a CSS-only mode** to existing CnChartWidget — e.g., `type="css-bar"` that bypasses ApexCharts
3. **Replace existing CnChartWidget** — breaks OpenConnector and any app using ApexCharts features

**Recommendation:** Option 1 (rename). A pure CSS bar chart and a full ApexCharts wrapper serve different use cases. Renaming avoids breaking existing consumers.

### Existing Component Inventory

**Components that already exist and are exported:**
- CnDashboardPage, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget
- CnKpiGrid, CnStatsBlock (together form the current KPI system)

**Components that exist but are NOT exported (barrel export bugs):**
- `CnChartWidget` — exists at `src/components/CnChartWidget/`, has `index.js`, but NOT in `src/components/index.js`
- `CnDetailCard` — exists at `src/components/CnDetailCard/`, NOT exported
- `CnDetailPage` — exists at `src/components/CnDetailPage/`, NOT exported
- `CnObjectSidebar` — exists at `src/components/CnObjectSidebar/`, NOT exported

**CnKpiWidget vs CnStatsBlock overlap:** CnStatsBlock already provides:
- Icon circle with variant colors (default/primary/success/warning/error)
- Formatted count display (`count.toLocaleString()`)
- Clickable state with hover/focus styling
- Horizontal and vertical layouts
- Breakdown details (key-value pairs)
- Loading and empty states

What CnStatsBlock lacks vs proposed CnKpiWidget:
- `format` prop (number/currency/percent/text) — CnStatsBlock only does `toLocaleString()`
- `locale` prop — CnStatsBlock uses the browser default
- `route` prop (Vue Router navigation) — CnStatsBlock emits `click` but doesn't navigate
- Accepts only `count` (Number) — proposed CnKpiWidget accepts String|Number `value`

**Recommendation:** Extend CnStatsBlock with `format`, `locale`, `route`, and rename `count` → `value` (with `count` as deprecated alias) rather than creating a duplicate CnKpiWidget.

### Migration Considerations

1. **CnDashboardPage stays on GridStack** — no migration needed for dashboards
2. **CnDetailPage grid mode** is purely additive — no migration for existing detail pages (opt-in via `layout` prop)
3. **CnStatsBlock extension** would be backwards-compatible (new props with defaults)
4. **Barrel export fixes** are safe — adding exports doesn't affect existing imports
5. **`src/mixins/` directory** does not exist yet and must be created
