A clickable tab strip rendered above a `CnIndexPage`'s table when the manifest declares `pages[].config.quickFilters`. Each tab carries a `filter` map that the parent (CnIndexPage) merges into the `useListView` fetch when the tab is active — composed AFTER `config.filter` (so the tab wins) and BEFORE the user's facet `activeFilters` (which can still narrow within the active tab).

Pill-shaped buttons, active one filled with `--color-primary-element`. Used inside the page, not as the app's main nav.

```vue
<template>
  <CnQuickFilterBar
    :tabs="[
      { label: 'Open', filter: { status: 'open' } },
      { label: 'Closed', filter: { status: 'closed' } },
    ]"
    v-model:active-index="active" />
</template>

<script>
export default {
  data() { return { active: 0 } },
}
</script>
```

In `manifest.json` (the usual entry-point — CnIndexPage mounts the bar for you):

```jsonc
{
  "id": "Tasks",
  "type": "index",
  "config": {
    "register": "app",
    "schema": "task",
    "quickFilters": [
      { "label": "Open",   "filter": { "status": "open" }, "default": true },
      { "label": "Closed", "filter": { "status": "closed" } },
      { "label": "Mine",   "filter": { "assignee": "@route.userId" } }
    ]
  }
}
```

## Tab shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | String | yes | i18n key or plain text rendered on the tab |
| `filter` | Object | yes | Filter map merged into the fetch when this tab is active. Same value syntax as `config.filter`: literals pass through; `"@route.<name>"` / `":<name>"` resolve from `$route.params`. |
| `default` | Boolean | no | Pre-selected on mount; first tab with `default:true` (else index 0) is active |
| `icon` | String | no | Optional MDI icon name shown next to the label |

## Props

- `tabs` (Array, required) — the tab definitions above.
- `activeIndex` (Number) — zero-based active tab; usable as `v-model:active-index` (single-select).
- `inline` (Boolean, default `false`) — render bare (no padding / border / background) for embedding inside another bar, e.g. the `#filters` slot of `CnActionsBar`.
- `mode` (String, default `'chips'`) — `'chips'` (pill strip) or `'dropdown'` (a single `NcSelect`; the empty-filter "All" tab is dropped — an empty selection means all).
- `multiple` (Boolean, default `false`) — allow several tabs active at once. Selection is exposed via the `selectedIndices` array prop + `update:selected-indices` event; the host ORs the selected tabs' filters together.
- `selectedIndices` (Array, default `[]`) — active tab indices when `multiple` is set (the array v-model).
- `selectLabel` (String, default `'Filter'`) — accessible label / placeholder for the dropdown control.
- `placeholder` (String) — placeholder text for the dropdown (falls back to `selectLabel`).

### Events

- `update:active-index` — single-select active index changed.
- `update:selected-indices` — multi-select index array changed (`multiple` mode).

## Composition order

CnIndexPage composes the active fetch's filters as:

1. `config.filter` (route-param fixed filter)
2. **Active tab's `filter`** — spread LAST, so a tab can override a colliding fixed-filter key (intentional — the tab is the user's intent)
3. User's facet `activeFilters` — narrowing within the active tab

Test on a manifest-driven `type:"index"` page: declare `config.quickFilters`, click between tabs, and the rows reload with the merged filter.
