# Manifest `type:"index"` follow-ups: quick-filter tabs, built-in `"link"`/`"date"` cell rendering, `readOnly` shorthand, `pages[].permission`, `handler:"emit"`

## Why

The fleet-wide manifest-index wave (pipelinq #351, procest #436, scholiq #71, zaakafhandelapp #203, softwarecatalog #231, decidesk #197) surfaced a tight cluster of `CnIndexPage` / manifest gaps. Each is small enough on its own that batching them into one change avoids per-feature opsx overhead, but together they remove the remaining friction from declarative `type:"index"` pages:

- **procest's `Voorstellen` filter-tabs were dropped** in the conversion (Concept / In behandeling / Afgerond) because `config.filter` is a *fixed* route-param filter, not a clickable UI toggle. Several apps want the same shape (a tab strip above the table that *changes* the active filter).
- **decidesk's `Decisions` declares `widget:"link"` on `title` and `formatter:"date"` on `decisionDate`**, but neither is built-in — they're inert until the consumer registers a `cellWidgets`/`formatters` entry. `"badge"` IS built-in; the parallel `"link"` widget and `"date"`/`"datetime"` formatter would let manifests use these without per-app boilerplate.
- **scholiq's `AssessmentResults`/`LearningPlanEvaluations`/`Signatures` had to spell out** `selectable:false, showAdd:false, showFormDialog:false, showEditAction:false, showCopyAction:false, showDeleteAction:false, showMassImport:false, showMassCopy:false, showMassDelete:false` to disable the default CRUD UI — a `config.readOnly:true` shorthand collapses that to one line.
- **procest's `WmsLayers*`/`LhsMatrices*` declare page-level `permission:"admin"`** which the schema's `$defs.page` rejects (`additionalProperties:false`). Allow it in the schema (documentation + manifest-validation pass) — actual gating is out of scope.
- **decidesk's `Decisions.actions` declares a `publish` action with `handler:"emit"`** that currently does nothing — the manifest-actions-dispatcher should at minimum re-emit `@action` with `{actionId, item}` so the consumer can wire it without dropping back to a custom row-actions array.

## What changes

### 1. Quick-filter tabs (`pages[].config.quickFilters`)

`type:"index"` pages gain an optional `config.quickFilters: Array<{label:string, filter:object, default?:boolean}>` — rendered as a segmented control / tab strip above the table. Clicking a tab merges its `filter` into the `useListView` fetch — spread **after** `config.filter` (fixed) and **before** the user's `activeFilters` (which can still narrow within the active tab). When omitted, behaviour is unchanged.

### 2. Built-in `"link"` cell widget

Alongside `"badge"`, `CnCellRenderer` resolves `widget:"link"` to a built-in component that renders the cell value as a `<router-link>` (or `<a href>`). Link target resolution: `widgetProps.route` (a manifest page id) → `$router.push({name:route, params:{id:row[rowKey]}})`; else `widgetProps.href` (an external URL — render `<a target="_blank">`); else the column falls through to plain text (with a `console.warn` once).

### 3. Built-in `"date"` / `"datetime"` formatters

`cnFormatters` ships default entries for `"date"` (locale-aware `Intl.DateTimeFormat` date), `"datetime"` (date + time), and `"relative-time"` (relative humanised — "3 days ago"). Consumer-registered formatters with the same id override the defaults. Non-string / non-parseable inputs render as the original value (no crash).

### 4. `config.readOnly:true` shorthand on `type:"index"`

When `pages[].config.readOnly === true` (read at render time by `CnPageRenderer`), the index page mounts with `selectable:false, showAdd:false, showFormDialog:false, showEditAction:false, showCopyAction:false, showDeleteAction:false, showMassImport:false, showMassCopy:false, showMassDelete:false` — unless the corresponding explicit prop is also set, in which case the explicit prop wins. Convenience only — equivalent to spelling all nine out.

### 5. `pages[].permission` in `$defs.page`

Add an optional `permission: string` property to the page `$defs` (`additionalProperties:false` currently rejects it, even though multiple apps declare it). Schema addition only — enforcement (`CnAppRoot` gating the page on `props.permissions.includes(permission)`) is a follow-up if/when consumers ask for it.

### 6. `actions[].handler:"emit"`

The manifest-actions-dispatcher (`useActionsDispatch` / `CnIndexPage.handleAction`) gains explicit support for the `"emit"` handler: on click, the page emits `@action` with `{actionId, item, action}`. Already documented as one of the supported handlers — this makes it actually work.

## Risks / scope

- Quick-filter tabs touch `CnIndexPage`'s setup (the `useListView` `fixedFilters` getter has to compose two layers: `config.filter` + the active tab). Backwards-compatible — `config.quickFilters` omitted → unchanged.
- Built-in `"link"` / `"date"` / `"datetime"` add three default registrations that consumers can override. A consumer that already registered same-named entries keeps winning.
- `config.readOnly:true` shorthand at `CnPageRenderer` level — needs careful prop-merging so explicit `show*` props still win.
- `pages[].permission` schema addition needs no `version` bump (additive, on existing `$def`).
- `handler:"emit"` is purely an addition to the dispatcher's switch.

No public-API removals. All six items are additive.

## Out of scope (separate)

- Enforcing `pages[].permission` (`CnAppRoot` gating). Schema-only here.
- `"currency"` / `"number"` formatters — file separately if needed.
- A general `config.tabs` orchestration (e.g. detail-page-style tabs that change the rendered page, not just the filter). `quickFilters` here is specifically the filter-toggle case.
