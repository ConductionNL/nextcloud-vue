# CnWidgetGrid

`CnWidgetGrid` is the per-slot CSS grid renderer used internally by
`CnPageRenderer` when dispatching v2 manifest pages. It receives a flat
array of widget entries for a single slot (`body`, `sidebar`,
`header-actions`, `footer`, `modal`, `tab:*`, `section:*`) and lays them
out as a CSS grid.

## Import

```js
import { CnWidgetGrid } from '@conduction/nextcloud-vue'
```

## When you'd use it directly

Most consumers don't — `CnPageRenderer` mounts it automatically for
every slot present on a v2 manifest page. You'd use it directly only
when embedding manifest-driven content inside a custom non-page
container (e.g. a modal or a sidebar tab that lives outside the page
shell).

## Slot column counts

Per [ADR-036 Decision 2](https://github.com/ConductionNL/hydra/tree/main/openspec/architecture/adr-036-manifest-v2-renderer.md),
the number of columns is determined by the slot name:

| Slot | Columns |
| --- | --- |
| `body` | 12 |
| `header-actions` | 12 |
| `footer` | 12 |
| `modal` | 12 |
| `tab:*` | 12 |
| `section:*` | 12 |
| `sidebar` | 1 |

`gridWidth` values exceeding `gridColumns` are clamped with a
`console.warn`.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `widgets` | `Array` | Widget entries for this slot (from `page.widgets[]` filtered by `slot`). |
| `slotName` | `String` | Slot key (e.g. `"body"`, `"sidebar"`, `"tab:general"`). |
| `registry` | `Object` | Consumer registry from `CnAppRoot`. Normally injected via `cnRegistry`; passed as prop only for standalone use. |

## Widget key resolution

Each entry's `widgetKey` is looked up in this order:

1. Built-in registry (`BUILT_IN_WIDGETS`) — covers `object-table`,
   `form-renderer`, `wiki-renderer`, `map-viewer`, `card-grid`, etc.
2. The consumer registry injected via `cnRegistry`.

Unknown widget keys are skipped with a `console.warn` so a stale
manifest doesn't blow up rendering of the rest of the slot.

## Spec

- REQ-MVR-004 (manifest-v2-renderer) — per-slot grid renderer
- ADR-036 Decision 2 — column-count convention
