# CnStatsBlockWidget

Manifest-driven dashboard widget that pulls a count from OpenRegister's GraphQL endpoint and forwards it to [`CnStatsBlock`](./cn-stats-block.md) for rendering. Mounted automatically by [`CnDashboardPage`](./cn-dashboard-page.md) when a widget definition has `type: 'stats-block'`.

Since ADR-049 (list-widget-enrichment) the widget also supports a **multi-entry** mode: an `entries[]` prop renders N related KPIs inside the one widget card, each entry self-fetching its own token-resolved count over OpenRegister's REST `/value` aggregation. Exactly one of `dataSource` / `entries` must be provided — the single-`dataSource` path is unchanged.

## Manifest example

```json
{
  "id": "minutes-in-review",
  "type": "stats-block",
  "title": "Notulen ter goedkeuring",
  "iconClass": "icon-file",
  "props": { "countLabel": "notulen", "variant": "warning" },
  "dataSource": {
    "register": "decidesk",
    "schema": "minutes",
    "filter": { "lifecycle": "review" },
    "aggregate": "count"
  }
}
```

## Multi-entry example (v2 `widgets[]`)

A grouped-KPI card — three related counts declared as manifest config,
no custom component:

```json
{
  "widgetKey": "stats-block",
  "slot": "body",
  "gridX": 0, "gridY": 0, "gridWidth": 4, "gridHeight": 6,
  "props": {
    "entries": [
      { "title": "Expiring soon", "register": "docudesk", "schema": "document",
        "filter": { "retention": { "lt": "@today+30d" } }, "variant": "warning",
        "route": { "name": "documents" }, "hideWhenZero": true },
      { "title": "Review required", "register": "docudesk", "schema": "document",
        "filter": { "status": "review" }, "hideWhenZero": true },
      { "title": "Archived", "register": "docudesk", "schema": "document",
        "filter": { "status": "archived" } }
    ]
  }
}
```

Each entry carries the same source contract as a `type: "stat"` widget
(`register`, `schema`, `metric`, `field`, token-resolved `filter` with
`@today` / `@me` / `@workspace.*` and `?`-optional clauses), plus
per-entry presentation (`title`, `variant`, `countLabel`), an optional
`route` deep link, and `hideWhenZero` (the entry is omitted from the
card when its resolved count is `0`).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataSource` | `object` | `null` | Manifest dataSource block (single-KPI mode). See [`useDataSource`](../utilities/composables/use-data-source.md). Exactly one of `dataSource` / `entries` must be provided. |
| `entries` | `array` | `[]` | Multi-entry declarative sources — one KPI per entry: `{ title, register, schema, metric, field, filter, route, variant, countLabel, hideWhenZero }`. Mutually exclusive with `dataSource`. |
| `title` | `string` | `''` | Block title (single-KPI mode). |
| `countLabel` | `string` | `''` | Label next to the count (single-KPI mode). |
| `variant` | `'default'\|'primary'\|'success'\|'warning'\|'error'` | `'default'` | Color variant (single-KPI mode). |
| `showZeroCount` | `boolean` | `true` | Show `0` instead of the empty-label fallback. |
| `horizontal` | `boolean` | `false` | Horizontal layout. |
| `route` | `object\|null` | `null` | Vue-router location; when set, the inner card becomes a `<router-link>` (single-KPI mode). |
| `iconClass` | `string` | `''` | Optional NC core icon class (`icon-link`, `icon-mail`, …) applied to the wrapping `<div>`. |

## Refresh wiring

The tile subscribes to `cn:page:refresh` — the channel the page-level Refresh action broadcasts on — and re-runs all three count paths: the REST `/value` aggregation, the per-entry counts of multi-entry mode, and the `dataSource` GraphQL query. There is no widget id to match on: a page refresh refreshes everything on the page.

This is the tile's only refresh affordance. `CnDashboardPage` renders it *without* `CnWidgetWrapper` (`CnStatsBlock` brings its own card chrome), so unlike the other data widgets it has no per-widget Refresh item in an overflow menu.

A ref-callable `refresh()` is also exposed, for parity with `CnChartWidget`.

## Notes

- Designed only for the manifest path. If you already have a count number in JS, mount [`CnStatsBlock`](./cn-stats-block.md) directly.
- Errors from the underlying GraphQL request fall back to `count = 0`. The dashboard never blanks on a transport failure.
