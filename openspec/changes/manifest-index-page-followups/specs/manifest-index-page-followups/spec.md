manifest-index-page-followups
---
status: draft
---
# `type:"index"` manifest follow-ups — quick-filter tabs, `"link"` widget, built-in date formatters, `readOnly` shorthand, `pages[].permission`, `handler:"emit"`

## Purpose

Six small additions to the `type:"index"` / cell-rendering / manifest-page surface that the fleet conversion wave (pipelinq #351, procest #436, scholiq #71, zaakafhandelapp #203, softwarecatalog #231, decidesk #197) flagged as friction. All additive, no public-API removals.

---

## ADDED Requirements

### Requirement: REQ-MIPFU-1 `pages[].config.quickFilters` MUST add a clickable tab strip to a `type:"index"` page

A `type:"index"` page MUST accept an optional `config.quickFilters: Array<{label, filter, default?, icon?}>`. When set, `CnIndexPage` MUST render a tab strip above the table; clicking a tab MUST set it active and re-fetch with its `filter` merged into the `useListView` `fixedFilters` — spread **after** `config.filter` (so the quick filter overrides a colliding fixed entry) and BEFORE the user's `activeFilters` (so user facets can still narrow within the active tab). The initially active tab MUST be the first entry with `default:true`, else index 0. Tab `filter` values MUST resolve `@route.<name>` / `:<name>` from `$route.params` just like `config.filter`. Omitting `quickFilters` MUST be behaviourally identical to today.

#### Scenario: Switching tabs re-fetches with the active filter
- GIVEN a `type:"index"` page with `config.quickFilters: [{label:"Open", filter:{status:"open"}, default:true}, {label:"Closed", filter:{status:"closed"}}]`
- WHEN the page mounts
- THEN the initial fetch params MUST include `status:"open"`
- AND WHEN the user clicks the "Closed" tab
- THEN the next fetch MUST include `status:"closed"` and the rows MUST update

#### Scenario: Quick filter wins over a colliding `config.filter`
- GIVEN `config.filter: { status: "open" }` AND `config.quickFilters: [{label:"All", filter:{}}, {label:"Closed", filter:{status:"closed"}, default:true}]`
- WHEN the page fetches with the default-active "Closed" tab
- THEN the fetch params' `status` MUST be `"closed"` (the quick filter wins)

#### Scenario: User facet can narrow within the active tab
- GIVEN a page on the "Open" quick-filter tab AND the user picks a facet value for a different key (e.g. `priority:"high"`)
- WHEN the re-fetch happens
- THEN the params MUST carry BOTH `status:"open"` AND `priority:"high"`

#### Scenario: No `quickFilters` → no tab strip and no behaviour change
- GIVEN a `type:"index"` page with no `config.quickFilters`
- WHEN it mounts
- THEN no tab strip MUST render and the `fixedFilters` composition MUST match the pre-change behaviour exactly

### Requirement: REQ-MIPFU-2 `widget:"link"` MUST be a built-in cell widget

`CnCellRenderer` MUST resolve `widget:"link"` to a built-in component (alongside the existing `"badge"`) that renders the cell value as a navigable link. The link target MUST resolve in this order:
1. `widgetProps.route` (a manifest page id) → `<router-link :to="{name: route, params: {id: row[rowKey]}}">`
2. `widgetProps.href` → `<a :href="..." target="_blank" rel="noopener">` (`{key}` placeholders in `href` MUST be substituted from the row, e.g. `"/foo/{id}"` → `"/foo/abc"`)
3. Neither — the cell MUST render as plain text (the displayed value), and a `console.warn` MUST fire ONCE per session unless `widgetProps.fallback === 'silent'`

The displayed text MUST be `formatted ?? value` (so a chained `formatter` still shapes the link's label). A consumer-registered `cellWidgets.link` MUST override the built-in.

#### Scenario: `widget:"link"` with `widgetProps.route` renders a router-link
- GIVEN a column `{ key:"title", widget:"link", widgetProps:{ route:"ContactDetail" } }` and a row `{ id:"abc", title:"Acme" }`
- WHEN the table renders
- THEN the cell MUST contain a `<router-link>` whose `to` resolves to `{name:"ContactDetail", params:{id:"abc"}}` and whose text content is `"Acme"`

#### Scenario: `widget:"link"` with `widgetProps.href` renders an external anchor
- GIVEN a column `{ key:"name", widget:"link", widgetProps:{ href:"https://x.example/{id}" } }` and a row `{ id:"42", name:"X" }`
- WHEN the table renders
- THEN the cell MUST contain `<a href="https://x.example/42" target="_blank" rel="noopener">X</a>`

#### Scenario: No target falls back to plain text + warns once
- GIVEN a column `{ key:"x", widget:"link" }` with no `widgetProps`
- WHEN the table renders the first row
- THEN the cell MUST render the value as plain text AND `console.warn` MUST have been called once mentioning the missing link target

### Requirement: REQ-MIPFU-3 `cnFormatters` MUST ship default `"date"`, `"datetime"`, `"relative-time"` entries

`CnAppRoot` MUST provide `cnFormatters` as `{ ...BUILT_IN_FORMATTERS, ...props.formatters }` so the built-ins are available by default and a consumer's same-named entry overrides. The built-ins MUST handle: `null` / `""` → empty string; a `Date` instance OR an ISO string / timestamp number → formatted via `Intl.DateTimeFormat` (`date`: `dateStyle:"medium"`; `datetime`: `dateStyle:"medium"+timeStyle:"short"`) or `Intl.RelativeTimeFormat` (`relative-time`); non-parseable input → the original value (no crash).

#### Scenario: `formatter:"date"` formats an ISO string
- GIVEN a column `{ key:"createdAt", formatter:"date" }` and a row `{ createdAt:"2026-05-13T10:00:00Z" }`
- WHEN the cell renders
- THEN it MUST display a locale-formatted date (e.g. `"13 May 2026"` in `en-GB`), NOT the raw ISO string

#### Scenario: A consumer-registered `date` formatter wins
- GIVEN `CnAppRoot` mounted with `formatters: { date: (v) => 'OVERRIDE:'+v }`
- AND a column `{ key:"x", formatter:"date" }` with a row `{ x:"2026-05-13" }`
- WHEN the cell renders
- THEN it MUST display `"OVERRIDE:2026-05-13"`

#### Scenario: Null / empty / non-parseable input is safe
- GIVEN a column `{ key:"d", formatter:"datetime" }`
- WHEN rows have `{d:null}`, `{d:""}`, `{d:"not a date"}`
- THEN the cells render empty / empty / `"not a date"` respectively — no exception

### Requirement: REQ-MIPFU-4 `config.readOnly:true` MUST be a shorthand on `type:"index"` for the nine read-only flags

`CnPageRenderer` MUST, when the resolved page is `type:"index"` AND `config.readOnly === true`, merge a `READ_ONLY_DEFAULTS` map UNDER the explicit `config.*` props before passing them to `CnIndexPage`: `selectable:false, showAdd:false, showFormDialog:false, showEditAction:false, showCopyAction:false, showDeleteAction:false, showMassImport:false, showMassCopy:false, showMassDelete:false`. An explicit `config.showAdd:true` MUST still win. `readOnly:false` (or omitted) MUST behave as today.

#### Scenario: `readOnly:true` disables the CRUD UI
- GIVEN a `type:"index"` page with `config: { register, schema, readOnly: true }`
- WHEN it mounts
- THEN the resolved `CnIndexPage` MUST receive `selectable:false`, `showAdd:false`, `showFormDialog:false`, `showEditAction:false`, `showCopyAction:false`, `showDeleteAction:false`, `showMassImport:false`, `showMassCopy:false`, `showMassDelete:false`

#### Scenario: Explicit prop wins over the shorthand
- GIVEN a `type:"index"` page with `config: { …, readOnly: true, showAdd: true }`
- WHEN it mounts
- THEN the resolved `CnIndexPage` MUST receive `showAdd: true` (but still `selectable:false`, `showEditAction:false`, etc.)

### Requirement: REQ-MIPFU-5 `pages[].permission` MUST validate against `$defs.page`

The manifest schema's `$defs.page` (currently `additionalProperties:false` with no `permission`) MUST add an optional `permission: string` property. A manifest with `pages[].permission: "admin"` MUST `validateManifest()` clean. Runtime enforcement (gating the page) is OUT of scope here — `CnPageRenderer` / `CnAppRoot` MAY ignore it.

#### Scenario: A manifest with page-level `permission` validates
- GIVEN a manifest containing `{ id:"X", route:"/x", type:"index", title:"X", permission:"admin", config:{…} }`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid:true, errors:[] }`

### Requirement: REQ-MIPFU-6 `actions[].handler:"emit"` MUST emit `@action` from `CnIndexPage`

The manifest-actions-dispatcher MUST, when an action's `handler === "emit"`, route the click through the page's existing `@action` emit path — no navigation, no registry lookup, no function-call dispatch. The emit payload MUST be the existing `{action: <label>, row: <item>}` shape (the `CnRowActions` emit, re-emitted by `CnIndexPage.onRowAction`) so consumer listeners keep working unchanged. Existing handlers (`"navigate"`, registry-name, function-valued, `"none"`) MUST continue to work.

#### Scenario: `handler:"emit"` re-emits the click
- GIVEN `CnIndexPage` with `actions: [{ id:"publish", label:"Publish", handler:"emit" }]`
- WHEN a row's "Publish" action is clicked on row `{id:"abc", title:"X"}`
- THEN the page MUST `$emit('action', { action:"Publish", row:{id:"abc",title:"X"} })` AND MUST NOT navigate or look up a custom-component handler

#### Scenario: `handler:"none"` suppresses the emit
- GIVEN `CnIndexPage` with `actions: [{ id:"x", label:"X", handler:"none" }]`
- WHEN the action is clicked
- THEN the page MUST NOT emit `@action` (the click is a no-op)
