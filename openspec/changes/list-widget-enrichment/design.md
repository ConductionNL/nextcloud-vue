# Design: list-widget-enrichment

## Context

`@conduction/nextcloud-vue` already ships most of the pieces ADR-049 Decision 2 needs. `CnDataTable` has `register`+`schemaId` self-fetch, `limit`, `viewAllRoute`/`viewAllLabel`, `rowClickRoute`, `rowIcon` (string | fn), `#row-actions`/`#empty`/`#footer` (`{ total, shown }`, PR #85) slots, `hideHeader`, borderless mode, `rowClass`/`cellClass`, sorting, selection, and resolves column `formatter` names against an injected `cnFormatters` registry via `CnCellRenderer`. `CnObjectListWidget` already self-fetches from a `content` block and resolves `@`-tokens with `resolveFilterTokens` (`@today`/`@me`/`@workspace.*`, `?`-optional via `dropOptionalUnresolved`/`hasUnresolvedTokens`). `actionsDispatcher.js` dispatches unified `actions[]` by `type` (`handler | open-modal | open-page | navigate`). `CnRowActions` renders an `NcActions` menu from an `actions[]` array with per-action `handler`/`disabled`/`visible`/`destructive`. `CnStatsBlockWidget` self-fetches a single count over OpenRegister's REST `/value` aggregation with token resolution.

The gap this change closes: `CnWidgetObjectTable` today only forwards `(register, schema, columns, rows, loading)` — it exposes none of the declarative `source`/token/compact-list/row-action surface; there are no relative-day formatters; `dispatchAction` has no mutation verb; and `CnStatsBlockWidget` is single-source only. This change wires the existing primitives together behind the ADR-049 declarative contract rather than building new machinery.

## Goals / Non-Goals

**Goals:**

- Enrich `CnWidgetObjectTable` with a declarative self-fetching `source` + full pass-through of `CnDataTable`'s existing list surface.
- Add generic `daysSince` / `daysUntil` display formatters to `BUILT_IN_FORMATTERS`.
- Add the `object-op` mutation type to `dispatchAction`, dispatched via `useObjectStore`, with confirm semantics and a reusable confirm dialog.
- Add multi-entry `entries[]` to `CnStatsBlockWidget`, backward-compatible with single `dataSource`.
- Update the v2 schema + regenerate the compiled validator.
- 100% JSDoc on new props/events/slots, docs pages + docusaurus partials, `@vue/test-utils` unit tests, green `npm test` + `npm run build`.

**Non-Goals:**

- Cross-object / derived FIELDS (open-vs-final joins, materialised `daysOverdue`, `lastActivity`). These stay server-side in OpenRegister declarative calc per ADR-031 — the library adds display transforms only. No widget `computed` may join/aggregate across objects.
- A parallel `object-list` widget key (ADR-049 explicitly rejects it — `object-table` is enriched in place).
- The hydra gate-29 ratchet (chain link 3) and the scaffold rewrite (chain link 4) — separate changes.
- The per-app fleet migrations (chain link 5) — they `depends_on` this change.

## Decisions

### Decision 1: Delta the `manifest-v2-renderer` capability, not a new one

The built-in widget contract's canonical home is `manifest-v2-renderer` (REQ-MVR-006 defines the `object-table` built-in; REQ-MVR-011 the unified actions dispatcher). All of ADR-049's library-side additions extend that same contract, so the delta ADDS requirements there rather than inventing a capability that would re-fragment the vocabulary. Alternative (a new `list-widget` capability) rejected — it would split one contract across two spec homes.

### Decision 2: Enrich `CnWidgetObjectTable`, reuse `CnDataTable` + `resolveFilterTokens`

Add a `source` prop to `CnWidgetObjectTable`. The widget resolves `source.filter` with `resolveFilterTokens` (+ `dropOptionalUnresolved`), passes `@resolve:` register sentinels through unexpanded, and drives `CnDataTable`'s existing self-fetch/ordering/limit — it does NOT re-implement fetching. New pass-through props (`columns` object form, `hideHeader`, `rowRoute`, `viewAllRoute`/`viewAllLabel`, `emptyText`, `rowIcon`, `#footer`) map straight onto `CnDataTable`. Externally supplied `rows` always win, so the existing interface is untouched. Alternative (a fresh list component) rejected — duplicates `CnDataTable` and violates ADR-049's "enrich in place".

### Decision 3: `object-op` as a new `dispatchAction` case + row-scoped `CnRowActions`

Add an `object-op` branch to `dispatchAction` that, given `{ op, values, confirm }` + a context carrying the object store, the widget's `source` register/schema, and the row, calls `useObjectStore.saveObject` (patch = row object merged with `values`; create = `values` as a new object) or `deleteObject`. `CnWidgetObjectTable` builds a per-row `CnRowActions` from its `actions[]` prop, wrapping each action's trigger to call `dispatchAction`. Reuses `CnRowActions` + `actionsDispatcher` rather than a new renderer. Alternative (`type:"handler"`-only writes) rejected by ADR-049 — keeps a per-app JS shim alive.

### Decision 4: `create` is widget-scoped; `patch`/`delete` are row-scoped

`create` has no row to mutate, so an `object-op` action with `op:"create"` renders as a widget-scoped affordance (list footer / header-actions) and creates against the widget's `source`. `patch`/`delete` render per row. This is a placement decision the ADR leaves to the implementation; making `create` a footer action keeps the row menu semantically "operations on THIS row". (Logged as a DEFERRED decision.)

### Decision 5: New generic `CnConfirmDialog` under `src/dialogs/`

`delete` always confirms; `patch`/`create` confirm on `confirm:true`. The existing `CnDeleteDialog` is delete-copy-specific and store-coupled; the object-op path needs a generic, verb-agnostic confirm surface. Add `src/dialogs/CnConfirmDialog.vue` (NcDialog-based, two-phase confirm→result pattern, `variant:"error"` for destructive), per the modal-isolation rule (dialogs live in their own file, never inline). Alternative (reuse `CnDeleteDialog`) rejected — its labels/behaviour assume a delete. (Logged as a DEFERRED decision — naming.)

### Decision 6: `daysSince`/`daysUntil` in `BUILT_IN_FORMATTERS` with lib i18n

Add both to `builtInFormatters.js`, importing `translate`/`translatePlural` from `@nextcloud/l10n` (app slug `nextcloud-vue`, as other library strings do). `daysUntil`: future → "N days remaining", today → "Due today", past → "N days overdue". `daysSince`: past → "N days ago", today → "Today". Use `translatePlural` for correct singular/plural. Keep the existing null-safe contract (return original/empty, never throw). English source strings are the i18n keys per the workspace i18n rule. (Exact key phrasing logged as DEFERRED.)

### Decision 7: Multi-entry `stats-block` via an optional `entries[]` prop

Add `entries: { type: Array, default: () => [] }` to `CnStatsBlockWidget` and relax `dataSource` from `required:true` to a validator that requires exactly one of `dataSource` / `entries`. When `entries` is set, render N `CnStatsBlock` KPIs in one card, each self-fetching its count over the same REST `/value` path (`fetchRest`, refactored to run per entry), honouring `route`, `variant`, `countLabel`, and `hideWhenZero` (omit when count === 0). When `entries` is absent, the single-`dataSource` path is byte-for-byte unchanged. Alternative (a separate `stats-group` widget) rejected — ADR-049 Decision 7 enriches `stats-block` in place. (Backward-compat approach logged as DEFERRED.)

### Decision 8: Schema change + regenerate the compiled validator

Hand-edit `src/schemas/app-manifest-v2.schema.json` to add: the `source` object on `object-table` props, the `object-op` action `$def` (`op` enum `patch|delete|create`, `values` object, `confirm` boolean), and the `entries[]` array on `stats-block` props. Then run `scripts/build-validators.js` to regenerate `validateManifestV2.compiled.js` — the generated artifact is never hand-edited.

## Risks / Trade-offs

- **[object-op tempts authority-in-manifest]** → Normative "intent, never authority" scenario in the spec; the widget never consults authorization-shaped fields; OR RBAC is the only authority and rejected writes surface as errors without local mutation.
- **[`daysSince`/`daysUntil` plural forms across locales]** → use `translatePlural` (not string interpolation) so the l10n layer picks the right form; null-safe so a bad date never blanks the table.
- **[Relaxing `dataSource` from required]** → validator enforces "exactly one of dataSource/entries" so a misconfigured widget fails loudly instead of rendering blank; single-source path unchanged.
- **[Compiled validator drift if hand-edited]** → task regenerates via `build-validators.js`; a test asserts a new-field manifest validates so drift is caught.
- **[Confirm dialog added to a hot list path]** → dialog is lazy/rendered only when a confirm-gated action fires; no cost on the default render.

## Migration Plan

Additive, no consumer migration required to land. New props default to no-op; `CnStatsBlockWidget.dataSource`, `CnWidgetObjectTable` external `rows`, and existing `dispatchAction` types are all preserved. Ships as the next `beta` on merge. Consumer apps adopt the contract in the chain-link-5 per-app migrations that `depends_on` this change. Rollback: revert the beta; no schema/data migration to undo (schema change is additive and backward-compatible).

## Open Questions

See the DEFERRED_QUESTIONS returned with this change: confirm-dialog naming (`CnConfirmDialog`), `create` placement (footer vs row), stats-block backward-compat shape (`entries` + one-of validator), and the exact i18n key phrasing for the relative-day formatters.
