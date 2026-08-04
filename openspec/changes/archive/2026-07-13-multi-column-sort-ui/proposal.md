---
kind: feature
---

# CnDataTable / CnIndexPage multi-column sort UI

## Why

OpenRegister's `QueryHandler` / `MagicMapper` already accept a multi-key `_order` map (`{"field1":"asc","field2":"desc"}` — a JSON-encoded object whose key order is the sort priority, decoded server-side by `ObjectsController::normalizeOrderParameter`). No frontend anywhere in the fleet exposes this: `CnDataTable` only supports a single `sortKey`/`sortOrder` pair, and every index page built on `CnIndexPage` inherits that single-key limit. Per ADR-Leaf-First, this is built once in nc-vue rather than per-app.

## What changes

- **`CnDataTable`**: shift+click a sortable header appends it as a secondary/tertiary sort key (capped at 3); plain click keeps today's single-sort behavior unchanged (cycle asc → desc → cleared on the active key, else replace with a fresh ascending single-key sort). Numbered priority badges (1, 2, 3) render next to the sort arrow once more than one key is active. Headers are keyboard-operable (Enter = click, Shift+Enter = append); `aria-sort` is maintained on the primary key only.
- **New pure utility** `src/utils/multiColumnSort.js` (`nextSortState`) implementing the click/shift-click state-transition machine, unit-tested independent of the component.
- **`CnIndexPage`**: threads the multi-key sort state to/from `CnDataTable`, translates it into OpenRegister's real `_order` query-param format (object literal serialized to a JSON string by the existing `buildQueryString`/axios param path — unchanged serialization, just now carrying more than one key), and persists it in `$route.query._order` (new — no sort state was previously persisted to the URL) so a reload or deep link keeps the same multi-column sort.
- **`useListView` composable**: extends internal state from a single `sortKey`/`sortOrder` pair to an ordered `sortKeys` array, kept in sync with the legacy refs for 100% backward compatibility.

## Emit-contract decision

The existing `CnDataTable` `sort` event payload (`{ key, order }`, mirroring the *primary* sort key/order) is preserved byte-for-byte — any existing listener that destructures `{ key, order }` keeps working unmodified, single-sort or not. The payload is **extended**, not replaced: a new `keys` field carries the full ordered array (`[{ key, order }, ...]`, 0 to 3 entries). This is the least-breaking option of the two considered (extended payload vs. a second `sort-multi` event) — a second event would require `CnIndexPage` to drive two independent state-update paths off the same interaction (double-fetch risk), whereas a single extended payload has exactly one source of truth per click.

## Non-goals

- Column drag-to-reorder / resize.
- Persisting sort preferences server-side (per-user saved views) — separate concern (see the concurrent `saved-views-ui` change).
- Sort on computed/aggregate columns (aggregate columns are client-side counts with no backing DB column to `ORDER BY`).

## Impact

- Additive/backward-compatible: no existing `CnDataTable` or `CnIndexPage` consumer changes behavior without opting in (shift+click).
- Cross-fleet: every app using `CnIndexPage` over an OpenRegister schema gets multi-column sort for free.

## Capabilities

### New Capabilities
- `multi-column-sort-ui` — `CnDataTable` shift-click multi-key sort with priority badges, keyboard support, and `CnIndexPage` wiring to OpenRegister's `_order` query format with route-query persistence.
