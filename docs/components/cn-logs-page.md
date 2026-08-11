---
sidebar_position: 12
---

# CnLogsPage

A read-only audit-trail / activity-log page. Wraps `CnDataTable` with server-side sorting, pagination and filtering, and supports two data-source modes selected via `pages[].config`:

- **OpenRegister-backed** — set `register` + `schema`. List state (params, paging, sort, filters) is driven by the shared `useListView` composable against `useObjectStore()`.
- **Custom URL** — set `source` to a HTTP endpoint. The component fetches via `axios.get(source)`. Sorting is applied client-side; there is no pagination.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "logs"`. Honours `headerComponent`, `actionsComponent`, and the generic `slots` map alongside the other built-in page types.

**Wraps**: `CnDataTable`, `CnPagination`, `CnPageHeader`, `CnDetailGrid`, `NcDialog`, `NcButton`, `NcEmptyContent`, `NcLoadingIcon`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Activity log'` | Page title (used by the optional inline header) |
| `description` | String | `''` | Subtitle shown under the title when `showTitle` is set |
| `showTitle` | Boolean | `true` | Whether to render the inline `CnPageHeader` **visibly**. When false the `<h1>` is still rendered visually-hidden, so the `<main>` landmark keeps its accessible heading |
| `icon` | String | `''` | MDI icon name |
| `register` | String | `''` | OpenRegister register slug (paired with `schema`). Changing it after mount requires a remount — `CnPageRenderer` already keys the page on register+schema |
| `schema` | String | `''` | OpenRegister schema slug (paired with `register`). Same remount note as `register` |
| `source` | String | `''` | Custom log-source URL — used when register+schema is not set |
| `columns` | Array | `[]` | Column definitions (strings → `{key, label}`; or full objects). When empty, a store-backed page derives its columns from the loaded schema — see [Columns](#columns) |
| `filter` | Object | `null` | Fixed filter map merged into every fetch, **above** the `$route.query` deep-link filters. Supports the `@route.<param>` / `:<param>` / `@me` / `@today±Nd` / `@workspace.<key>` token grammar. Store mode only |
| `pagination` | Object | `null` | Page-size config; only `limit` is read, sent as `_limit`. Null = the store default of 20. Store mode only |
| `sortKey` | String | `null` | Initial sort column. Null sends no `_order`, leaving the server's own ordering in place |
| `sortOrder` | String | `'asc'` | Initial sort direction. Inert while `sortKey` is null |
| `sortKeys` | Array | `[]` | Initial multi-column sort as an ordered priority list — `[{ key, order }, …]`. Takes precedence over `sortKey`/`sortOrder` when non-empty |
| `fixedLayout` | Boolean | `false` | Make the columns' declared `width` authoritative (`table-layout: fixed`) rather than a hint the browser may override from cell content — see [Column widths](#column-widths) |
| `rowDetail` | Boolean | `false` | Open a read-only detail dialog on a row click, rendering the entry's fields including nested bags (a stack trace, an argument map). Default false keeps a row click inert |
| `rowKey` | String | `'id'` | Property used as the unique row identifier |
| `emptyText` | String | `'No log entries to show'` | Text rendered when there are no entries |
| `errorText` | String | `'Could not load log entries'` | Text rendered when fetch fails |
| `closeLabel` | String | `'Close'` | Label for the row-detail dialog's close button |
| `store` | Object | `null` | Override the default `useObjectStore()` (e.g. when the consumer uses `createObjectStore` with a custom ID) |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, description, icon }` | Replaces the default `CnPageHeader` |
| `actions` | — | Right-aligned actions (refresh, export). Filled by `pages[].actionsComponent` when set |
| `empty` | — | Replaces the empty-state |
| `error` | `{ error }` | Replaces the error block |
| `row-actions` | `{ row }` | Per-row action menu inside the table |
| `row-detail` | `{ row }` | Replaces the built-in row-detail dialog body |
| `column-<key>` | `{ row, value }` | Custom cell renderer for a specific column |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `row-click` | `row` | A log row's body was clicked. Fires whether or not `rowDetail` opened the dialog, so a host can navigate instead of (or as well as) showing it |
| `action` | — | Declared for hosts dispatching row actions through the `#row-actions` slot. Never emitted by this component itself; kept in the surface because consumers may already listen for it |

A `refresh()` method is also exposed for `actionsComponent` implementations to call.

## Filtering

In store mode two filter sources are merged into every request, with `filter` winning a key collision:

1. **`$route.query`** — every non-`_`-prefixed entry becomes a filter, so a "View logs" link like `/jobs/logs?jobId=<uuid>` lands the page scoped to one parent. Reserved list params (`_page`, `_limit`, `_search`, `_order`) are skipped. Array values (`?status[]=a&status[]=b`) stay arrays, which the API reads as an IN match.
2. **`filter`** — the page's own scoping from the manifest, with tokens resolved at fetch time.

A same-path query change re-fetches, so pushing a new `?jobId=` onto an already-mounted page re-scopes the list.

## Columns

`columns` wins whenever it is set. When it is empty:

- **Store mode with a loaded schema** → `CnDataTable` derives the columns from the schema, giving type-aware cell rendering (dates, booleans, enums) for free. Properties of `type: 'object'` are excluded, so nested bags don't render as raw JSON.
- **`source` mode, or a schema that failed to load** → the legacy default of `[timestamp, actor, action, target, details]`.

That legacy default matches no OpenRegister log schema, which is why a store-backed page prefers the schema. Curate the set explicitly when you want specific widths, badges or formatters.

## Column widths

A log table is a bad fit for the browser's default `table-layout: auto`, where a column's `width` is only a hint and the real widths come from cell content. Two things go wrong:

- Any column left **unsized** absorbs every remaining pixel. With one free-text `message` column and five sized ones, `message` ends up several times wider than it needs to be.
- A long **unbreakable** value — a PHP FQCN like `OCA\OpenConnector\Action\SynchronizationAction`, a UUID — has a min-content width equal to the whole string. It widens its own column, and where it can't, the text paints past the cell box and collides with the next column.

Set `fixedLayout` to make the declared widths binding. Long values then wrap inside their cell instead of overflowing it. Size **every** column when you do (percentages summing to 100 are the easiest to reason about) — columns left unsized share whatever is left, which reintroduces the first problem.

## Manifest configuration

```jsonc
{
  "id": "job-logs",
  "route": "/jobs/logs",
  "type": "logs",
  "title": "myapp.logs.title",
  "config": {
    "register": "openconnector",
    "schema": "job_log",
    // OR a custom source URL:
    // "source": "/index.php/apps/myapp/api/logs"
    "sortKey": "created",
    "sortOrder": "desc",
    "pagination": { "limit": 50 },
    "rowDetail": true,
    "fixedLayout": true,
    // Percentages summing to 100, honoured exactly because of `fixedLayout`.
    "columns": [
      { "key": "created", "label": "Time", "sortable": true, "width": "14%", "formatter": "datetime" },
      {
        "key": "level",
        "label": "Level",
        "width": "9%",
        "widget": "badge",
        "widgetProps": { "colorMap": { "info": "info", "warning": "warning", "error": "error" } }
      },
      { "key": "message", "label": "Message", "sortable": false, "width": "38%" },
      {
        "key": "executionTime",
        "label": "Duration",
        "width": "9%",
        "format": { "style": "duration", "unit": "milliseconds" }
      },
      { "key": "jobClass", "label": "Job class", "sortable": true, "width": "19%" },
      {
        "key": "stackTrace",
        "label": "Stack trace",
        "sortable": false,
        "width": "11%",
        "formatter": "count",
        "formatterOptions": { "singular": "{n} frame", "plural": "{n} frames", "zero": "—" }
      }
    ]
  }
}
```

## Usage (standalone)

```vue
<template>
  <CnLogsPage
    register="audit-trail-immutable"
    schema="audit-event"
    :columns="['timestamp', 'actor', 'action']"
    sort-key="timestamp"
    sort-order="desc"
    :pagination="{ limit: 50 }"
    row-detail
    show-title
    title="Activity" />
</template>

<script>
import { CnLogsPage } from '@conduction/nextcloud-vue'
export default { components: { CnLogsPage } }
</script>
```

## Custom-fallback notes

- The component does NOT bundle a filter bar, time-range picker, or actor autocomplete — those live in the consumer's `actionsComponent` (or as `row-actions` slot fills). Deep-link filters and a manifest `filter` cover the common "scope this log to one parent" case without any of that.
- The row-detail dialog renders a bag of primitives (a stack trace's frames, an argument map) as its own labelled grid, and anything deeper as pretty-printed JSON. Override the whole body with `#row-detail` when a log shape deserves bespoke rendering.
- `fetchCollection` records failures on the store rather than throwing, so the `#error` slot reads `store.errors[type]` in store mode.
- When neither register+schema nor source is set, the component renders the empty-state and emits a single `console.warn`. This is deliberate — a misconfigured manifest does not break the app shell.
