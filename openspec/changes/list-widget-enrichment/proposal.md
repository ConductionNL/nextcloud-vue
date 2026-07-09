---
kind: code
depends_on:
  - declarative-widget-vocabulary
---

# Proposal: list-widget-enrichment

## Why

ADR-049 (hydra `declarative-widget-vocabulary`, PR #70) ratchets custom dashboard **widgets** the way ADR-036 Decision 7 ratcheted custom pages: a fleet audit on 2026-07-05 found ~30 bespoke `NcDashboardWidget`/`v-for` list components across seven apps, nearly all rendering the same surface — a filtered, ordered, limited list of OpenRegister objects with a couple of columns, row-click navigation, an optional per-row action menu, and a "view all" footer. The library's built-in `object-table` widget cannot yet express that whole surface as manifest config, so apps keep hand-rolling. This change closes the vocabulary gap in the library so those ~30 widgets can dissolve into manifest JSON.

This is **CHAIN LINK 2** of the ADR-032 chain headed by hydra `declarative-widget-vocabulary` (ADR-049, the spec-only head that merges first):

1. `declarative-widget-vocabulary` (hydra, `kind: config`) — ADR-049 + `manifest-v2` delta + gate-29 spec. **This change `depends_on` it.**
2. **THIS change** (`nextcloud-vue`, `kind: code`, targets `beta`) — implements Decisions 2, 3, 4 (display side), 7 in the library.
3. hydra gate-29 implementation (`check_custom_widget_ratchet.py`) — runs **in parallel** after link 1, independent of this change.
4. scaffold-v2 addendum (`nextcloud-app-template`) — runs **in parallel** after link 1, independent of this change.
5. Per-app fleet migrations (`opsx-pipeline`, one change per app) — each `depends_on` **THIS** change, because they consume the enriched `object-table` / `object-op` / `stats-block` contract this change ships.

## What Changes

- **Enriched `object-table` list contract (Decision 2)** — `CnWidgetObjectTable` gains a declarative `source` prop `{ register, schema, filter, order, limit }` that self-fetches, with `filter` token-resolved via the existing `resolveFilterTokens` grammar (`@today`, `@me`, `@workspace.*`, `?`-optional clauses; `@resolve:` sentinels on `register` pass through). Adds pass-through of the already-shipped `hideHeader`, `#footer` `{ total, shown }`, `rowRoute`, `viewAllRoute`/`viewAllLabel`, `emptyText`, `rowIcon` (string | fn), and `columns` object form (incl. `formatter`). Reuses `CnDataTable`'s existing self-fetch + slots — no duplication.
- **Generic relative-day formatters (Decision 4, display side)** — add `daysSince` and `daysUntil` to `BUILT_IN_FORMATTERS` (`cnFormatters` registry), producing i18n'd relative phrasing ("N days overdue" / "N days remaining" / "Due today" / "N days ago") through the library's own `t()` / `translatePlural()`. These are the ONLY new formatters the audit requires; cross-object/derived FIELDS stay server-side in OR declarative calc (out of scope — the library adds display transforms only).
- **Declarative row `actions[]` + new `object-op` action type (Decision 3)** — `CnWidgetObjectTable` accepts a declarative `actions[]` prop rendered per row through the existing `CnRowActions`. The existing `dispatchAction` (actionsDispatcher.js) gains an `object-op` case: `{ type: "object-op", op: "patch" | "delete" | "create", values, confirm }` dispatched via `useObjectStore` (`saveObject` / `deleteObject`) against the widget's `source` register/schema. `delete` ALWAYS confirm-gates; `patch`/`create` opt in via `confirm: true`. Intent-not-authority: the manifest carries no authorization; RBAC is enforced server-side by OpenRegister.
- **New `CnConfirmDialog` (Decision 3, modal-isolation)** — a generic two-phase confirmation dialog under `src/dialogs/` (NcDialog-based) used by the object-op confirm path. Own file per the modal-isolation rule.
- **Multi-entry `stats-block` (Decision 7)** — `CnStatsBlockWidget` accepts an optional `entries[]` array, each an independent token-resolved `source` (`register`/`schema`/`metric`/`filter`) with optional `route` deep-link and `hideWhenZero`. Renders multiple `CnStatsBlock` KPIs in one card. Backward-compatible: the existing single `dataSource` path is unchanged when `entries` is absent.
- **Schema + validator regen** — `src/schemas/app-manifest-v2.schema.json` gains the `source` shape on `object-table` props, the `object-op` action type (`op`/`values`/`confirm`), and `stats-block` `entries`; the compiled validator artifact is regenerated via `scripts/build-validators.js` (never hand-edited).

No BREAKING changes: every new prop has a default and every existing prop interface is preserved (`dataSource` stays functional; `object-table` still renders when passed only `rows`/`columns`).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `manifest-v2-renderer`: ADDS the enriched declarative `object-table` list contract (`source` self-fetch + token resolution, column/formatter/compact-list/row-icon pass-through), the generic `daysSince`/`daysUntil` display formatters, declarative row `actions[]` with the new `object-op` mutation type and its confirmation semantics, the derivation-placement rule (display-only transforms in the library; cross-object fields in OR calc), and multi-entry `stats-block` sources. This is the canonical home of the built-in widget contract (REQ-MVR-006 `object-table`, REQ-MVR-011 unified actions dispatcher).

## Impact

- **Consumer apps affected**: all list/stats-widget consumers — zaakafhandelapp, opencatalogi, pipelinq, procest, scholiq, softwarecatalog (via the link-5 per-app migrations that `depends_on` this change). OpenRegister/OpenCatalogi/Procest/Pipelinq/MyDash all consume the library. Additive only — existing consumers see no behavior change until they adopt the new props.
- **Backward compatibility**: additive — new props default to no-op; `CnStatsBlockWidget.dataSource` single-source path, `CnWidgetObjectTable` pass-through, and `CnRowActions`/`dispatchAction` existing types are all preserved.
- **Theming**: relative-day formatters and the confirm dialog use Nextcloud CSS variables only (`--color-*`, `--color-error` for destructive); no `--nldesign-*` references.
- **Files**: `src/components/CnWidgetObjectTable/`, `src/utils/builtInFormatters.js`, `src/utils/actionsDispatcher.js`, `src/components/CnStatsBlockWidget/`, `src/dialogs/CnConfirmDialog.vue` (new), `src/schemas/app-manifest-v2.schema.json` + generated `validateManifestV2.compiled.js`, docs/ + docusaurus partials, `tests/`.
