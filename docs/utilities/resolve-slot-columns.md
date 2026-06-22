# resolveSlotColumns

`resolveSlotColumns(slotName, slotColumns?, propColumns?)` resolves the grid
column count for a manifest slot. It is the **single source of truth** shared by
the renderer (`CnWidgetGrid`) and the validator (`validateManifest`) so the two
can never disagree about how wide a slot is — a disagreement would let a
manifest pass validation yet clip at render time.

## Import

```js
import { resolveSlotColumns } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function resolveSlotColumns(
    slotName: string,            // e.g. "body", "sidebar", "tab:general"
    slotColumns?: object | null, // per-page override map (page.config.slotColumns)
    propColumns?: number | null, // explicit override (CnWidgetGrid `columns` prop)
): number
```

## Resolution order

First defined wins:

1. an explicit `propColumns` (the `CnWidgetGrid` `columns` prop)
2. a per-page override `slotColumns[slotName]`
3. the library default for the slot — `body` / `footer` / `header-actions` /
   `modal` / `tab:*` / `section:*` = **12**, `sidebar` = **1** (ADR-036
   Decision 2)

Absent (1) and (2), this reproduces the fixed ADR-036 Decision 2 defaults
exactly, so existing apps are unaffected. Invalid override values (non-integer,
zero, negative) are ignored and fall back to the default.

## Example

```js
resolveSlotColumns('body')                 // → 12  (default)
resolveSlotColumns('sidebar')              // → 1   (default)
resolveSlotColumns('body', { body: 8 })    // → 8   (per-page override)
resolveSlotColumns('body', { body: 8 }, 6) // → 6   (explicit prop wins)
```

## Related

- ADR-036 Amendment 2026-06-17 — per-page `slotColumns` override.
