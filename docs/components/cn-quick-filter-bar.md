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
| `activeIndex` | Number | `null` | Zero-based index of the currently active tab, or `null` for none active. Pair it with `@update:active-index` (or `v-model:active-index`); the removed Vue-2 `model` option means a *bare* `v-model` binds nothing. |
| `inline` | Boolean | `false` | Render bare (no padding / bottom border / background) for embedding inline inside another bar — e.g. the `#filters` slot of `CnActionsBar`, so the tabs sit beside the view toggle instead of as a separate row. |
| `maxVisible` | Number | `0` | Chips mode only: how many pills render inline before the rest move behind an overflow chip. `0` renders every tab. |

## Events

| Event | Payload | When |
|-------|---------|------|
| `update:active-index` | `Number` | Emitted when the user clicks a different tab. The parent updates its own state and triggers the re-fetch (CnIndexPage's `onQuickFilterChange`). |

## Slots

None — labels and icons are declarative via the `tabs` prop.

## Styling

Pill-shaped buttons. Active state uses `--color-primary-element` / `--color-primary-element-text` (NL Design + dark/light themes work out of the box). Tab strip uses `--color-main-background` with a bottom border (`--color-border`).

Override via your app's CSS if needed — the component exposes `.cn-quick-filter-bar`, `.cn-quick-filter-bar__tabs`, `.cn-quick-filter-bar__tab`, `.cn-quick-filter-bar__tab--active`, `.cn-quick-filter-bar__label`, `.cn-quick-filter-bar__icon` class names, and for the overflow `.cn-quick-filter-bar__more`, `.cn-quick-filter-bar__more--icon-only`, `.cn-quick-filter-bar__more-panel`, `.cn-quick-filter-bar__more-list` and `.cn-quick-filter-bar__more-item`.

## Dropdown & multi-select

Set `mode="dropdown"` to render a single `NcSelect` instead of the chip strip (the empty-filter "All" tab is dropped — an empty selection means all). Set `multiple` to allow several filters active at once; the selection is exposed via the `selectedIndices` array prop + `update:selected-indices` event (the host ORs the selected tabs' filters into one fetch). `selectLabel` / `placeholder` label the dropdown. On a manifest `type:"index"` page, drive both from `config.quickFilterMode` and `config.quickFilterMultiple`.

## Overflow chip

A page with more than a handful of lenses wraps the strip onto a second line and squeezes whatever shares the bar with it — on `CnIndexPage` that is the "Showing X of Y" count. Set `maxVisible` (manifest: `config.quickFilterMaxVisible`) to keep the everyday few as pills and put the rest behind one more chip:

```json
"quickFilters": [ … 15 lenses … ],
"quickFilterMaxVisible": 4
```

The overflow is **a chip and not a toolbar button** — a button would break the strip's rhythm into "badge, badge, badge, control", and the thing it opens is a filter like the ones beside it. So it wears the same pill, sits at the end of the row as a bare `⋯` while nothing behind it is on, and opens a small panel of *more chips* rather than a menu of text rows.

The visible set is the **first `maxVisible` entries in declared order**, so reorder `quickFilters` to change which lenses stay out — there is no per-entry pin. Picking a lens from the panel applies it exactly as clicking a pill does and closes the panel; in `multiple` mode the panel stays open so several can be toggled in one visit. An active hidden lens moves its label and its primary fill onto the chip (`2 filters` when more than one is on in `multiple` mode), so a narrowed list never presents itself as "All". `maxVisible` is ignored in `dropdown` mode, which already collapses every lens into one control.

## See also

- [CnIndexPage](./cn-index-page.md) — the host that reads `config.quickFilters` and mounts this bar
- [`migrating-to-manifest.md` § Quick-filter tabs](../migrating-to-manifest.md) — manifest authoring guide
