---
title: CnQuickFilterBar
---

# CnQuickFilterBar

A clickable tab strip rendered above the table inside `CnIndexPage` when the manifest declares `pages[].config.quickFilters`. Each tab carries a `filter` map that the parent merges into the `useListView` fetch when the tab is active.

Visual: a horizontal row of pill-shaped buttons; the active one is filled with the primary colour, the rest outlined. It's a thin styled `<button>` list rather than `NcAppNavigation*` — this lives **inside** the index page, not as the app's main nav.

## Try it

```vue
<CnQuickFilterBar
  :tabs="[
    { label: 'Open', filter: { status: 'open' } },
    { label: 'Closed', filter: { status: 'closed' } },
  ]"
  :active-index="0"
  @update:active-index="onChange" />
```

In manifests:

```json
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

`CnIndexPage` reads `quickFilters` and renders this bar automatically; consumers usually don't mount `CnQuickFilterBar` directly.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | Array | *(required)* | Tab definitions. Each entry is `{ label, filter, default?, icon? }`. `filter` is consumed by the *parent* (CnIndexPage merges it into the fetch), not by this component. |
| `activeIndex` | Number | `null` | Zero-based index of the currently active tab, or `null` for none active. Usable as `v-model:active-index` (default Vue 2.6+ model). |

## Events

| Event | Payload | When |
|-------|---------|------|
| `update:active-index` | `Number` | Emitted when the user clicks a different tab. The parent updates its own state and triggers the re-fetch (CnIndexPage's `onQuickFilterChange`). |

## Slots

None — labels and icons are declarative via the `tabs` prop.

## Styling

Pill-shaped buttons. Active state uses `--color-primary-element` / `--color-primary-element-text` (NL Design + dark/light themes work out of the box). Tab strip uses `--color-main-background` with a bottom border (`--color-border`).

Override via your app's CSS if needed — the component exposes `.cn-quick-filter-bar`, `.cn-quick-filter-bar__tab`, `.cn-quick-filter-bar__tab--active`, `.cn-quick-filter-bar__label`, `.cn-quick-filter-bar__icon` class names.

## See also

- [CnIndexPage](./cn-index-page.md) — the host that reads `config.quickFilters` and mounts this bar
- [`migrating-to-manifest.md` § Quick-filter tabs](../migrating-to-manifest.md) — manifest authoring guide
