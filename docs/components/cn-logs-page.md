---
sidebar_position: 12
---

# CnLogsPage

A read-only audit-trail / activity-log page. Wraps `CnDataTable` with sensible default columns (`timestamp`, `actor`, `action`, `target`, `details`) and supports two data-source modes selected via `pages[].config`:

- **OpenRegister-backed** — set `register` + `schema`. The component fetches via `useObjectStore()`.
- **Custom URL** — set `source` to a HTTP endpoint. The component fetches via `axios.get(source)`.

Mounted automatically by `CnPageRenderer` when a manifest page declares `type: "logs"`. Honours `headerComponent`, `actionsComponent`, and the generic `slots` map alongside the other built-in page types.

**Wraps**: `CnDataTable`, `CnPageHeader`, `NcEmptyContent`, `NcLoadingIcon`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `'Activity log'` | Page title (used by the optional inline header) |
| `description` | String | `''` | Subtitle shown under the title when `showTitle` is set |
| `showTitle` | Boolean | `false` | Whether to render the inline `CnPageHeader` |
| `icon` | String | `''` | MDI icon name |
| `register` | String | `''` | OpenRegister register slug (paired with `schema`) |
| `schema` | String | `''` | OpenRegister schema slug (paired with `register`) |
| `source` | String | `''` | Custom log-source URL — used when register+schema is not set |
| `columns` | Array | `[]` | Column definitions (strings → `{key, label}`; or full objects). Defaults to `[timestamp, actor, action, target, details]` |
| `rowKey` | String | `'id'` | Property used as the unique row identifier |
| `emptyText` | String | `'No log entries to show'` | Text rendered when there are no entries |
| `errorText` | String | `'Could not load log entries'` | Text rendered when fetch fails |
| `store` | Object | `null` | Override the default `useObjectStore()` (e.g. when the consumer uses `createObjectStore` with a custom ID) |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `header` | `{ title, description, icon }` | Replaces the default `CnPageHeader` |
| `actions` | — | Right-aligned actions (refresh, export). Filled by `pages[].actionsComponent` when set |
| `empty` | — | Replaces the empty-state |
| `error` | `{ error }` | Replaces the error block |
| `row-actions` | `{ row }` | Per-row action menu inside the table |
| `column-<key>` | `{ row, value }` | Custom cell renderer for a specific column |

## Events

The component emits no events directly; consumer interactions go through the slots (header buttons, row actions). A `refresh()` method is exposed for `actionsComponent` implementations to call.

## Manifest configuration

```jsonc
{
  "id": "audit-logs",
  "route": "/logs",
  "type": "logs",
  "title": "myapp.logs.title",
  "config": {
    "register": "audit-trail-immutable",
    "schema": "audit-event"
    // OR a custom source URL:
    // "source": "/index.php/apps/myapp/api/logs"
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
    show-title
    title="Activity" />
</template>

<script>
import { CnLogsPage } from '@conduction/nextcloud-vue'
export default { components: { CnLogsPage } }
</script>
```

## Custom-fallback notes

- The component does NOT bundle filters, time-range pickers, or actor autocomplete — those live in the consumer's `actionsComponent` (or as `row-actions` slot fills). If your log surface needs richer filtering, drop in a custom action area.
- The default columns assume an OR audit-event-shape (`timestamp`, `actor`, `action`, `target`, `details`). Logs that don't match this shape should pass an explicit `columns` array.
- When neither register+schema nor source is set, the component renders the empty-state and emits a single `console.warn`. This is deliberate — a misconfigured manifest does not break the app shell.
