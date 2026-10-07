---
sidebar_position: 3
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDetailPage.md'

# CnDetailPage

A generic detail/overview page component. The simpler counterpart to CnIndexPage — designed for pages that display statistics, charts, card grids, or other detail content without multi-object tables or CRUD dialogs.

**Wraps**: NcEmptyContent, NcLoadingIcon, NcButton (from @nextcloud/vue), CnIcon

## Try it

<Playground component="CnDetailPage" />

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Page title |
| `description` | String | `''` | Optional subtitle shown below the title |
| `icon` | String | `''` | MDI icon name (rendered via CnIcon) |
| `iconSize` | Number | `28` | Icon size in pixels |
| `loading` | Boolean | `false` | Loading state |
| `loadingLabel` | String | `'Loading...'` | Message shown during loading |
| `sidebar` | Boolean \| Object | `false` | Sidebar configuration. Accepts EITHER the legacy Boolean form (deprecated) OR the new Object form mirroring `CnIndexPage.sidebar`. See [Sidebar config object](#sidebar-config-object) below. |
| `sidebarOpen` | Boolean | `true` | Whether the sidebar starts open (only relevant when `sidebar` is active) |
| `objectType` | String | `''` | Object type slug passed to the sidebar (e.g. `'pipelinq_lead'`). Used by legacy direct mounts; manifest-driven detail pages prefer the `register` + `schema` pair below and let the page fuse them. |
| `objectId` | String\|Number | `''` | Object ID passed to the sidebar and (in schema-driven mode) to `objectStore.fetchObject`. |
| `register` | String | `''` | **Schema-driven mode** — OpenRegister register slug. When paired with `schema` (and `objectId`), the page fuses them into an internal `${register}-${schema}` object-type slug, registers it on the store, fetches the object + its schema via `useObjectStore`, and auto-renders `CnObjectDataWidget` + `CnObjectMetadataWidget` when the default slot is empty. `objectType` wins on collision so existing direct mounts stay untouched. |
| `schema` | String | `''` | **Schema-driven mode** — OpenRegister schema slug. See `register`. |
| `hideEmpty` | Boolean | `false` | Hide valueless fields on the auto-rendered data widget (see [`CnObjectDataWidget`](./cn-object-data-widget.md)'s `hide-empty`). Set it from the manifest as `config.hideEmpty` for a **discriminated supertype** — one schema holding several variants, where each object only carries the fields its variant uses. A widget declaring its own `content.hideEmpty` still wins over this page-level default. |
| `createForm` | String | `'auto'` | **Create archetype switch (ADR-062).** Whether this page renders its OWN create form dialog when reached without an object id. Set from the manifest as `config.createForm`. `'auto'` (default) — heuristic: only when the page is schema-bound, has no object id, and supplies no body of its own (no default slot, no grid layout). `'never'` — never render it; use when the body owns data entry (e.g. a CnObjectDataWidget or registry component already provides the form), which stops two form dialogs stacking. `'always'` — render it even when the page has a body, for a page that deliberately pairs custom content with a create form. The dialog is always the generic schema-driven `CnFormDialog`, so it follows the same OpenRegister/schema form rules (required, readOnly, enum/$ref, `visibleWhen`). |
| `includeFields` | Array | `null` | Fields the create and edit forms ask for, in this order. `null` asks for every property the schema declares. Same three keys as [`CnIndexPage`](./cn-index-page.md), so one manifest describes the record's form wherever it opens rather than the list page and the detail page each carrying their own. |
| `excludeFields` | Array | `[]` | Fields the create and edit forms never ask for. Applied after `includeFields`. |
| `fieldOverrides` | Object | `{}` | Per-field widget / label overrides for the create and edit forms, keyed by field name. Forwarded to [`CnFormDialog`](./cn-form-dialog.md). |
| `sidebarTabs` | Array | `[]` | Tab definitions for the host App's `CnObjectSidebar`. Forwarded via the injected `objectSidebarState`; mirrors `sidebar.tabs` / `sidebarProps.tabs` but lives at the top level so the manifest's `config.sidebarTabs` flows in directly. Empty array → the consumer's `CnObjectSidebar` falls back to its default tab set. |
| `sidebarProps` | Object | `{}` | Extra sidebar configuration forwarded to `CnObjectSidebar` (`register`, `schema`, `hiddenTabs`, `title`, `subtitle`, `tabs`). Set `sidebarProps.tabs` to an open-enum tab array to drive the host app's mounted `CnObjectSidebar` from `manifest.json` — see [CnObjectSidebar custom tabs](./cn-object-sidebar.md#custom-tabs). The array flows through the existing `objectSidebarState` provide/inject channel. **Note:** when both `sidebar` (Object) AND `sidebarProps` set the same field, the Object form wins and a `console.warn` lists the conflicting fields once per component instance. |
| `error` | Boolean | `false` | Error state |
| `errorMessage` | String | `'An error occurred'` | Message shown in error state |
| `onRetry` | Function | `null` | Callback for retry button in error state. If null, no retry button shown. |
| `retryLabel` | String | `'Retry'` | Retry button text |
| `notFoundRoute` | Object\|String | `null` | Router location of the not-found state's back button. `null` sends the user to `/`. CnPageRenderer fills it with the index page the record was opened from (`_from`), else the index page on the same register and schema. |
| `notFoundRouteLabel` | String | `''` | Name of the `notFoundRoute` page, shown as "Back to {page}". Without it the button reads "Back to home". |
| `empty` | Boolean | `false` | Empty state |
| `emptyLabel` | String | `'No data available'` | Message shown in empty state |
| `statsTitle` | String | `''` | Title above the statistics table |
| `statsColumns` | Array | `[]` | Column defs for stats table: `[{ key: string, label: string, align?: 'left'\|'center'\|'right' }]` |
| `statsRows` | Array | `[]` | Row data for stats table (objects keyed by column keys; set `indent: true` for sub-row styling) |
| `maxWidth` | String | `'1200px'` | Maximum width of the page content |
| `columnOpts` | Object \| null | responsive table | **Responsive reflow for the body grid**, measured against the **grid's own width** rather than the window's — so a page rendered in a narrow container (a split pane beside a list) reflows even though the viewport is wide. Defaults to a single threshold — the authored **12 columns above 1000px, one stacked column at or below it** (`columnMax: 12`). There are deliberately no steps in between: `moveScale` rescales the authored geometry, so an intermediate count puts widgets at fractional positions nobody placed (a `gridWidth: 3` tile becomes 1 of 4), which reads as a broken page rather than a narrow one. 1000px is where a `gridWidth: 3` side panel drops under 250px — below its own title. Pass `null` for a fixed 12-column grid at every size. Note this is **not** `getDashboardColumnOpts()`, which sets `breakpointForWindow: true` and so cannot see a narrow container. |
| `lifecycleActions` | Object \| null | `null` | **Declarative lifecycle transitions.** When set, lists status-gated transitions in the header Actions menu driven by the object's `x-openregister-lifecycle`. `{ field?: 'status' }` fetches the allowed transitions live from OpenRegister's `/available-actions` endpoint; an explicit `{ transitions: [{ from, to, action, label, confirm?, variant? }] }` is filtered client-side by the object's current state. See [CnLifecycleActions](./cn-lifecycle-actions.md). |
| `inlineActions` | Number \| null | `null` | Set to **fold this page's own Edit button in with the header actions**, so it becomes an entry in the Actions menu rather than a button beside it. `null` keeps Edit standalone. The number caps nothing here — this page draws its header actions as Actions-menu entries (`display: "menu"`), where there are no buttons to cap; it remains [CnActionButtons](./cn-action-buttons.md)' `inline` count for a host that mounts that component in `buttons` mode. |
| `relatedCollections` | Array | `[]` | **Declarative related-object list sections** rendered below the detail body. Each entry `{ title?, register, schema, filter?, columns?, sort?, limit?, rowRoute? }` renders a titled `CnObjectListWidget` scoped to this object via `@objectId` / `@object.<field>` tokens. See [CnRelatedCollections](./cn-related-collections.md). |
| `summaryAggregates` | Array | `[]` | **Declarative cross-schema summary chips** in the header. Each entry `{ label, register, schema, metric?, field?, filter?, format? }` runs one count/sum/avg over a related schema scoped to this object. See [CnSummaryAggregates](./cn-summary-aggregates.md). |
| `relationLinks` | Array | `[]` | **Declarative relation-link actions.** Each entry `{ label?, register, schema, fkField, labelField?, allowCreate?, title?, selectLabel? }` renders a button that opens a search-and-link modal which patches a foreign key on this object. See [CnRelationLinkModal](./cn-relation-link-modal.md). |
| `bodyWidgets` | Array | `[]` | **Declarative IN-BODY sections.** Each entry `{ id?, component, title?, props?, placement?, colSpan?, card? }` renders a REGISTERED host-app component as a titled section in the page **body** (not the sidebar), with the object/page context injected. `component` is a registry name resolved from the app's v2 `registry` (any kind exposing a `.component`, e.g. `kind:"section"` / `kind:"widget"`) or the legacy `customComponents` map — **no sidebar tab is required**. `props` values are token-resolved (`@objectId`, `@object.<field>`, `@workspace.<key>`, `@config.<key>`; unset optional `@…?` tokens are dropped). `placement` is `before-body` \| `after-data` \| `after-related` \| `end` (default `end`). `colSpan` (1–12) lays sections out on a grid when several share a placement. `card: true` draws the section in the same card as the grid's widgets. The loaded object + objectId are also `provide`d on `cnSectionContext` so a host component can inject them instead of taking props; its `setObject(object)` puts an object the section saved into the page, so the rest of the page shows it without a re-fetch. A section whose component can't be resolved, or that throws while rendering, degrades to an inline error and never breaks the page. See [CnBodySections](./cn-body-sections.md). |
| `appConfig` | Object | `{}` | **Page-level app config** exposed to declarative widget / section config via the **`@config.<key>` token** and `provide`d on `cnAppConfig`. Lets a stat widget's `format: { style: 'currency', currency: '@config.currency' }` format with a configured value (e.g. the reporting currency a setup wizard captures) instead of a hard-coded `EUR`, and an endpoint KPI's URL / params + filter values interpolate `@config.<key>`. A manifest renderer typically seeds it from `loadState(appId, 'config', {})`. Backwards-compatible: a literal `"EUR"` still works, and an unset required `@config.<key>` falls back to the format default. |

## The action model

A record page can carry forty actions in one menu, and then nobody finds the one they need. These keys put the actions on four levels. Each is opt in, so a page that sets none of them renders as before.

| Level | Where | Key |
|-------|-------|-----|
| 1. The next step | One primary button. Its label follows the record's stage. | `primaryActionByStage` |
| 2. Quick actions | At most three buttons that are always visible. | `quickActions` |
| 3. The rest | The overflow menu, in named groups. | `group` on a header action |
| 4. Admin actions | The last group of that menu, for admins only. | `adminOnly` on a header action |

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `primaryActionByStage` | Object \| null | `null` | Map from a stage value to the page's primary action. A value is an action in the `headerActions` shape, or the id of a declared header action. A stage without an entry falls back to `primaryAction`. |
| `stageField` | String | `'status'` | Dot-path to the field that holds the record's stage. Read by `primaryActionByStage` and `nextStep`. |
| `quickActions` | Array | `[]` | Always visible header buttons. At most three render. An entry is an action object or the id of a declared header action, which then leaves the menu. |
| `actionsMenu` | Object \| null | `null` | `{ showRefresh?, showHelpLinks?, label? }`. `showRefresh: false` removes Refresh. `showHelpLinks: false` removes Request a feature, Report a bug and Documentation. `label` names the menu. |
| `nextStep` | Object \| null | `null` | The "what now" card above the body: `{ field?, stages: { <stage>: { title?, checklist, after? } } }`. See [CnNextStepCard](./cn-next-step-card.md). |
| `typePill` | Object \| null | `null` | A pill above the title: `{ field, colorMap?, labels?, variant? }`, rendered through [CnStatusBadge](./cn-status-badge.md). |
| `statusPill` | Object \| null | `null` | A second pill, same shape, for where the record stands. |
| `sideColumn` | Array | `[]` | A column of cards beside the body. An entry is a widget definition or the id of a widget in `widgets`. |
| `isAdmin` | Boolean \| null | `null` | Whether the viewer administers this instance, for `adminOnly` actions. `null` reads it from Nextcloud. |

### The next step follows the stage

```json
"config": {
  "stageField": "status",
  "primaryActionByStage": {
    "ontvangen": { "id": "take-on", "label": "Take on", "type": "api-call", "method": "POST", "url": "/apps/dossiq/api/cases/@objectId/claim", "refresh": true },
    "in_behandeling": "continue-review",
    "besluit": "record-decision"
  }
}
```

The button is dispatched the same way a header action is: the same dialogs, the same toast, the same `visibleWhen`. An action named by id leaves the menu while it is the button. The skip link at the top of the page lands on it. When the stage's action is hidden by its own `visibleWhen`, the page falls back to `primaryAction`.

Stage keys are matched exactly first, then ignoring case.

### Quick actions

```json
"quickActions": ["message", "document", "log-contact"]
```

Keep them the same on every record of a type, so a handler finds them without looking. A fourth entry is dropped, and the manifest schema refuses it.

### Groups and admin actions in the menu

```json
"headerActions": [
  { "id": "hand-over", "label": "Hand over to team", "type": "open-modal", "target": "HandOverDialog", "group": "Case" },
  { "id": "extend-term", "label": "Extend term", "type": "open-modal", "target": "ExtendTermDialog", "group": "Case" },
  { "id": "withdraw", "label": "Withdraw publication", "type": "api-call", "url": "/apps/dossiq/api/cases/@objectId/withdraw", "group": "Publication" },
  { "id": "raw-data", "label": "Raw data", "type": "open-modal", "target": "RawDataDialog", "adminOnly": true }
]
```

Ungrouped actions come first. Each group follows under a caption, in the order the groups first appear. `adminOnly` actions form the last group, titled "Administration", and only an instance admin sees them.

`adminOnly` hides a control. It does not protect anything: the endpoint behind the action decides who may call it.

### Help links out of the record

```json
"actionsMenu": { "showRefresh": false, "showHelpLinks": false, "label": "More" }
```

Use this when your app offers Request a feature, Report a bug and Documentation in its own help menu. The record's menu then holds the record's actions and nothing else. Leave a key out and that part stays as it is.

### What now

```json
"nextStep": {
  "stages": {
    "in_behandeling": {
      "title": "What now? Step 2: handling",
      "after": "Then: step 3, decision",
      "checklist": [
        { "label": "Confirm receipt to the resident", "doneField": "receiptConfirmedAt" },
        { "label": "Review the documents", "doneWhen": { "field": "openDocuments", "op": "eq", "value": 0 } },
        { "label": "Draft the decision", "doneField": "decision" }
      ]
    }
  }
}
```

The card renders above the body and the side column. While it shows, the primary button sits inside it, next to the checklist that explains it, and not in the header as well. A stage without an entry shows no card and the button stays in the header.

### Pills above the title

```json
"typePill": { "field": "caseTypeName", "variant": "error" },
"statusPill": {
  "field": "status",
  "colorMap": { "ontvangen": "info", "in_behandeling": "primary", "afgehandeld": "success" },
  "labels": { "ontvangen": "Received", "in_behandeling": "Handling", "afgehandeld": "Closed" }
}
```

`colorMap` is keyed on the raw value. `labels` maps a raw value to the text to show, and goes through the translate function. A pill whose field is empty does not render.

### Side column

```json
"sideColumn": [
  "case-term",
  { "type": "data", "title": "Handling", "content": { "include": ["assignee", "team", "startDate"], "columns": 1, "editable": false } },
  "case-requester"
]
```

The column sits to the right of the body and holds facts: the deadline, the requester, the handler, the links. A string names a widget declared in the page's `widgets`, which is how a `custom` widget gets there. An object is a widget definition of its own.

The column drops under the body when the page is too narrow for both. That is decided by the room the page has, not by the viewport, so it also holds beside an open sidebar. A `layout` grid keeps working next to it.

## The record as a place

These three are what make a record somewhere a handler stays, rather than somewhere they pass through. Each is off by default, so a page that declares none renders exactly as it does today.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `listNavigation` | Object | `null` | Next and previous within the list this record was opened from, as returned by [`useListNavigation`](../utilities/composables/use-list-navigation.md). Shape: `{ available, isFirst, isLast, position, total }`. Omit it and neither control renders, which is what a record reached by a bare link must do. |
| `previousTo` | Object \| String | `null` | Router location of the previous record, as `useListNavigation`'s `previousRoute`. When set, the previous control is a real link (middle-click and open in new tab work) and `previous-record` is emitted with `{ event, to }` after the link navigated. `null` keeps it a button that only emits. |
| `nextTo` | Object \| String | `null` | Router location of the next record, as `useListNavigation`'s `nextRoute`. Same behaviour as `previousTo`. |
| `primaryAction` | Object | `null` | The page's primary action, as declared on its manifest page. Renders as the header's primary button and is where the skip link lands. Shape: `{ id?, label, icon?, route?, href? }`. |
| `tabInAddress` | Boolean | `false` | Puts the active tab in the address as `?_tab=<id>`, so a link points at a tab of this record rather than at the record. |

Wire the navigation in the host, because the host owns the router:

```js
const nav = reactive(useListNavigation({
  route: useRoute(),
  router: useRouter(),
  currentId: toRef(props, 'objectId'),
  objectType: 'case',
}))
```

```vue
<CnDetailPage
  :listNavigation="nav"
  :previousTo="nav.previousRoute"
  :nextTo="nav.nextRoute"
  :primaryAction="{ id: 'afhandelen', label: 'Zaak afhandelen' }"
  tabInAddress
  @next-record="nav.goNext"
  @previous-record="nav.goPrevious" />
```

With `previousTo` and `nextTo` the two controls are links, so they can be opened in a new tab. The link navigates by itself; `goNext` and `goPrevious` see the `{ event, to }` payload and do not push a second time, so keeping the listeners is safe.

Three refusals are deliberate. A record opened without list context offers no next and no previous, rather than inferring an order nobody chose. The first and the last record say so rather than wrapping. An address naming a tab that does not exist, or one this reader may not see, falls back to the first tab they can see and says so once.

The tabless address is corrected with `replace`, not `push`, so the back button does not walk into the address the reader was just moved off (ADR-052). Later tab changes push, so back and forward walk the tabs they actually visited.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `edited` | `object` | The header **Edit** form saved successfully; payload is the saved record. Only fires when `showEditAction` is set. |
| `transitioned` | `{ action, to, object }` | A declarative lifecycle transition (from `lifecycleActions`) succeeded on this page's object. |
| `relation-linked` | `object` | A `relationLinks` action patched a foreign key on this page's object; payload is the updated object. |
| `related-row-click` | `{ collection, row, index }` | A row in a `relatedCollections` section was clicked. |
| `layout-change` | `Array` | A widget in the body grid was dragged or resized in edit mode. Payload is the updated layout array. The sibling `update:layout` event fires with the same payload so an explicit-layout page can use `:layout.sync`. |
| `widget-config-change` | `object \| null` | A body-grid widget's config was saved via the cog editor (the widget def), or the widget was removed (`null`). |
| `next-record` | `{ event, to }` \| none | The reader asked for the next record of the list this one was opened from. With `nextTo` set the link has navigated already and the payload is `{ event, to }`; without it there is no payload and the host steps. |
| `previous-record` | `{ event, to }` \| none | The reader asked for the previous record of that same list. Payload as `next-record`, keyed on `previousTo`. |
| `primary-action` | `object` | The declared primary action was pressed. Payload is the declaration. |
| `tab-change` | `string` | The active tab changed. Fires whether or not `tabInAddress` is set. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#icon` | — | Custom icon (replaces CnIcon) |
| `#header-actions` | — | Action buttons in the header (right side) |
| `#translation-badge` | `{ object }` | Replace the default [`CnTranslatedBadge`](./cn-translated-badge.md) rendered between the title and description when the resolved object's `_translationMeta.translatedFrom` is set. The badge auto-hides on source-of-truth objects, so consumers don't need to gate the slot. Introduced by the `cn-detail-translation-aware-surfacing` change. |
| `#error` | — | Custom error state content |
| `#error-actions` | — | Extra buttons inside the default error state |
| `#not-found` | `{ target }` | Replace the default not-found state. It shows instead of the header and body when the schema-driven fetch answers 404; `target` is the back button's router location. |
| `#empty` | — | Custom empty state content |
| `#empty-actions` | — | Extra buttons inside the default empty state |
| `#stats-header` | — | Custom header above the stats table (replaces default h3) |
| `#stats-rows` | — | Custom table body rows (replaces auto-generated rows) |
| `#default` | — | Main content below the stats table |
| `#sections` | — | Additional content below the default slot |
| `#footer` | — | Footer content (separated by a border) |
| `#widget-{widgetId}` | `{ item, widget }` | Per-widget slot in the body grid (name is `widget-<widgetId>`). Override the default render for one grid cell. `item` is the layout descriptor, `widget` the resolved definition. |

## Body grid (adjustable Data + Related)

The detail body is, at its core, a real drag/resize grid powered by
[`CnDashboardGrid`](./cn-dashboard-grid.md) (GridStack):

- **Default body.** In schema-driven mode (`register` + `schema` + `objectId`),
  once the object loads the body is seeded with two default widgets — a `data`
  widget ([`CnObjectDataWidget`](./cn-object-data-widget.md)) and a `related`
  widget ([`CnRelatedObjectsWidget`](./cn-related-objects-widget.md)). Set
  `showRelatedObjects: false` to seed only the data widget.
- **Edit mode.** When the page is in Buildiq edit mode (injected
  `cnEditingBody`), widgets can be dragged, resized and configured (the per-widget
  cog opens the registered config editor). Geometry changes emit `layout-change`
  / `update:layout`.
- **Explicit grid pages.** Passing `layout` + `widgets` props (a manifest grid
  page) feeds the same engine, so hand-authored grid pages are draggable too. The
  default body is only synthesized when no explicit `layout` is supplied.
- **Widget types** rendered by the grid: `data`, `related`, `integration`, and
  any registered content-driven catalog type (stat / chart / delta / gauge /
  object-list / …). A `#widget-<widgetId>` slot overrides any cell.
- **Field-scoped data widgets (ADR-062).** A `data` widget's `content` accepts
  `include` (field whitelist) / `exclude` (blacklist), forwarded to
  `CnObjectDataWidget` — so one object can be presented as several purposeful
  data widgets ("Core case data" / "Process"), each sized to its field count.
  `collapsedFields` pins how many fields show before "Show all N fields";
  left out, the widget keeps the whole rows that fit its cell.
- **Content-only catalog widgets get card chrome.** `object-list` / `table`
  cells render on `CnWidgetWrapper` with the widget def's `title` (they have no
  chrome of their own); self-chromed catalog widgets (stat / chart / …) render
  bare, as before.
- **Cell-overflow dev warning (ADR-062: the cell is the budget).** In
  non-production builds the page console.warns any grid cell whose rendered
  content is taller than its `gridHeight` — overflow is a design bug (enlarge
  the cell or scope the widget's content), never a scroll surface.

## Sidebar config object

`CnDetailPage.sidebar` accepts EITHER form:

- **Boolean (legacy, deprecated)** — `:sidebar="true"` activates
  the external `CnObjectSidebar` via the `objectSidebarState`
  inject; `false` deactivates. The first time this form is
  observed per component instance a one-shot `console.warn` fires
  pointing at the migration path.
- **Object (preferred)** — mirrors `CnIndexPage.sidebar` plus
  detail-specific fields:

  ```js
  sidebar: {
    show: true,         // default true; false suppresses the sidebar
    enabled: true,      // default true; false bypasses the external sidebar
    register: 'leads',  // forwarded via objectSidebarState
    schema: 'lead',
    hiddenTabs: ['notes'],
    title: 'Lead detail',
    subtitle: '...',
    tabs: [             // see manifest-abstract-sidebar
      { id: 'overview', label: 'lead.overview', widgets: [{ type: 'data' }] },
    ],
  }
  ```

  Use `show: false` to hide the sidebar declaratively without
  removing the rest of the config (e.g. behind a feature flag or
  a responsive layout watcher).

### Migrating from boolean

Replace:

```vue
<CnDetailPage
  :sidebar="true"
  :sidebar-props="{ register: 'leads', schema: 'lead', tabs: [...] }"
  object-type="lead"
  :object-id="id" />
```

With:

```vue
<CnDetailPage
  :sidebar="{ register: 'leads', schema: 'lead', tabs: [...] }"
  object-type="lead"
  :object-id="id" />
```

`sidebarProps` continues to work for backwards compatibility — when
both `sidebar` (Object) and `sidebarProps` are set with overlapping
fields, the Object form wins and a `console.warn` fires once per
component instance listing the conflicting fields.

## Sidebar tabs from a manifest

Manifest `type:'detail'` pages declare their sidebar tabs in
`config.sidebarTabs[]` (the human-authored source of truth). Each
entry has `id` + `label` (required), optional `icon`, `order`,
`component`, `_note`. Widgets bound to a tab carry
`tabGroup: "<tab.id>"` on `slot:"sidebar"` entries.

```json
{
  "id": "ZaakDetail",
  "route": "/zaken/:id",
  "type": "detail",
  "title": "Case",
  "config": {
    "register": "zaakafhandelapp",
    "schema": "zaak",
    "sidebarTabs": [
      { "id": "overview", "label": "Overview", "order": 10 },
      { "id": "history",  "label": "History",  "order": 20, "icon": "icon-history" }
    ]
  },
  "widgets": [
    { "widgetKey": "data", "slot": "sidebar", "tabGroup": "overview", "gridX": 0, "gridY": 0, "gridWidth": 1, "gridHeight": 1 }
  ]
}
```

The validator checks two invariants:

1. **Tab shape** — each `sidebarTabs[]` entry MUST have non-empty `id` + `label`; `id`s MUST be unique within the page.
2. **Cross-reference** — every `widgets[]` entry with `slot:"sidebar"` and a `tabGroup` value MUST match a declared `sidebarTabs[].id`. Catches the silent-typo case where a tab-bound widget references a non-existent tab.

The CLI `manifest-migrate` transform lifts `config.sidebarTabs[].widgets[]` into top-level `widgets[]` with `slot:"sidebar"` + `tabGroup` at build time. Component-only tab entries (declaring only `component`) are carried forward in the residual `sidebarTabs[]` for runtime resolution against the customComponents registry.

## Usage

### Basic detail page with statistics table

```vue
<template>
  <CnDetailPage
    title="Register Overview"
    description="Statistics for this register"
    icon="DatabaseOutline"
    :loading="loading"
    :stats-title="'Register Statistics'"
    :stats-columns="[
      { key: 'type', label: 'Type' },
      { key: 'total', label: 'Total' },
      { key: 'size', label: 'Size' },
    ]"
    :stats-rows="[
      { type: 'Objects', total: 150, size: '2.4 MB' },
      { type: 'Invalid', total: 3, size: '-', indent: true },
      { type: 'Deleted', total: 7, size: '-', indent: true },
      { type: 'Files', total: 42, size: '1.1 MB' },
      { type: 'Logs', total: 230, size: '512 KB' },
    ]">
    <div class="chart-grid">
      <ChartCard title="Audit Trail"><LineChart :data="auditData" /></ChartCard>
      <ChartCard title="Objects by Schema"><PieChart :data="schemaData" /></ChartCard>
    </div>
    <div class="card-grid">
      <SchemaCard v-for="schema in schemas" :key="schema.id" :schema="schema" />
    </div>
  </CnDetailPage>
</template>
```

### With error handling and retry

```vue
<template>
  <CnDetailPage
    title="Schema Details"
    :error="hasError"
    error-message="Failed to load schema details"
    :on-retry="loadSchema">
    <template #error-actions>
      <NcButton @click="$router.push('/registers')">
        Back to Registers
      </NcButton>
    </template>
    <DetailContent :schema="schema" />
  </CnDetailPage>
</template>
```

### Custom stats rows (manual table body)

When the auto-generated rows from `statsRows` aren't flexible enough, use the `#stats-rows` slot to render your own `<tr>` elements:

```vue
<template>
  <CnDetailPage
    title="Register Stats"
    :stats-columns="[
      { key: 'type', label: 'Type' },
      { key: 'total', label: 'Total' },
      { key: 'size', label: 'Size' },
    ]">
    <template #stats-rows>
      <tr>
        <td>Objects</td>
        <td>{{ stats.objects?.total || 0 }}</td>
        <td>{{ formatBytes(stats.objects?.size || 0) }}</td>
      </tr>
      <tr class="cn-detail-page__stats-row--sub">
        <td class="cn-detail-page__stats-cell--indented">Invalid</td>
        <td>{{ stats.objects?.invalid || 0 }}</td>
        <td>-</td>
      </tr>
    </template>
  </CnDetailPage>
</template>
```

## Public (unauthenticated) detail pages

`pages[].config.mode: 'public'` marks a detail route as unauthenticated — token-scoped reader pages like credential verification or shared-link views. Pair with the `@route.<param>` sentinel (see [`resolveRouteSentinels`](../utilities/resolve-route-sentinels.md)) for the token binding:

```json
{
  "id": "CredentialVerify",
  "route": "/credentials/:token/verify",
  "type": "detail",
  "title": "Verify credential",
  "config": {
    "register": "scholiq",
    "schema": "credential",
    "mode": "public",
    "filter": { "token": "@route.token" }
  }
}
```

The schema's typed `mode` enum (`edit | create | public`) gives consumers IDE completion + sharp validator errors on typos. Today the manifest carries the intent — `CnDetailPage` does not yet branch on `mode` for auth-header bypass; the host app skips auth headers based on the route. A follow-up will wire native public-mode handling into the component so consumers don't have to coordinate auth-bypass externally.

## When to use CnDetailPage vs other page components

| Component | Use when... |
|-----------|-------------|
| **CnDetailPage** | Displaying detail info, stats tables, charts, card overviews — no multi-object CRUD |
| **CnIndexPage** | Listing objects with table/cards, pagination, search, mass actions, CRUD dialogs |
| **CnDashboardPage** | Building a widget-based dashboard with drag-and-drop grid layout |

## Collaborative editing defaults

`CnDetailPage` auto-subscribes to live updates for the current object. This wires [`useObjectSubscription`](../utilities/composables/use-object-subscription.md) into the page lifecycle so users see remote changes without polling — including remote pessimistic locks. The store it binds to resolves in two ways:

1. **Explicit `objectStore` prop** (existing behaviour, unchanged) — pass your own store instance; the page subscribes when `objectType`/`objectId` (or `register`+`schema`+`objectId`) are known.
2. **Schema-driven / manifest mode** — when `register` + `schema` are set and no `objectStore` prop is passed (the `CnPageRenderer` path), the page falls back to the library's default `useObjectStore()` — the same store its self-fetch uses — so **manifest-driven detail pages get live updates with zero app-side wiring**. Legacy `objectType`-only mounts without an explicit store keep today's behaviour (no subscription).

Live events are hints: the underlying `liveUpdatesPlugin` refetches the object (burst-coalesced, in-flight-deduped), the store cache updates, and the page re-renders reactively. When notify_push is unavailable the transport falls back to visibility-gated polling.

When the cached `@self.locked` block indicates another user holds the lock, `CnDetailPage` mounts [`CnLockedBanner`](./cn-locked-banner.md) above the content. The banner renders only when `lockedByMe === false`.

Opt-out props:

| Prop | Default | Behaviour |
|------|---------|-----------|
| `subscribe` | `true` | When `false`, skips the auto-subscribe (useful for read-only / archive views). From a manifest: `pages[].config.subscribe: false`. |
| `objectStore` | `null` | Pinia store instance. When set it always wins over the schema-driven fallback. When omitted **and** the page is not in schema-driven mode, both subscribe and lock-state are skipped. |

See [`useObjectLock`](../utilities/composables/use-object-lock.md) for the lock state contract; the lib does not yet auto-acquire on edit-mode toggle (planned for a follow-up cycle that wires the form dialogs).

## Integration props (AD-19)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `surface` | String | `'detail-page'` | Rendering surface forwarded to integration widgets in the grid layout (widget defs with `type === 'integration'`). Drives the AD-19 surface fallback. |
| `integrationContext` (`integration-context`) | Object \| null | `null` | Object context `{ register, schema, objectId }` forwarded to integration widgets. When omitted it is derived from `sidebarProps.register` / `sidebarProps.schema` (or `objectType`) and `objectId`. |

## Built-in Actions menu

The header carries the shared [`CnActionsMenu`](./cn-actions-menu.md) overflow `…` — **Refresh**, **Documentation**, and **Request a feature** — after any `#actions` slot content. Request-a-feature is **on by default**; **Refresh is shown only when it will do something** — `showRefresh` is tri-state (`true`/`false` force it; the default `null` is **auto**: shown when a consumer attached an `@refresh` listener *or* the page is in schema-driven mode and can self-fetch). A legacy `objectType`-mode page that never wires `@refresh` therefore shows no dead Refresh button. Force it with `:show-refresh="true"`/`false`; opt out of Request-a-feature with `:show-request-feature="false"`.

- **Refresh** emits `@refresh` and, unless the host calls `event.preventDefault()`, fires the `cn:page:refresh` event-bus channel with `{ widgetId, title }`.
- **Documentation** renders only when `documentationUrl` is set, opening it in a new tab.
- **Request a feature** opens the forge's feature-request issue form with the `detail:<id>` surface as its English headline, when mounted under `CnAppRoot`.

Set `:page-id` for a stable id/surface (it otherwise falls back to a slugified `title`). All the menu props are forwarded to [`CnActionsMenu`](./cn-actions-menu.md):

| Prop | Default | Description |
|------|---------|-------------|
| `documentationUrl` | `''` | When set, renders the **Documentation** entry (opens in a new tab). |
| `documentationLabel` | `t('Documentation')` | Pre-translated Documentation label. |
| `specRef` | `''` | Forwarded to the feature-request modal. |
| `refreshing` | `false` | While true, the Refresh item is disabled and shows a loading spinner for as long as this stays true (reflects the real refresh time). |
| `refreshLabel` | `t('Refresh')` | Pre-translated Refresh label. |
| `requestFeatureLabel` | `t('Request a feature')` | Pre-translated Request-a-feature label. |
| `actionsMenuLabel` | `t('Actions')` | Pre-translated overflow-menu trigger label. |

| Slot | Description |
|------|-------------|
| `action-items` | Extra items appended inside the overflow menu, after the built-in trio. |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDetailPage.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDetailPage/CnDetailPage.vue) and update automatically whenever the component changes.

<GeneratedRef />

### Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showRelatedObjects` | Boolean | `true` | Whether to render the Related section beneath the data widget. Set `false` on pages that surface relations elsewhere (e.g. the sidebar) to drop the section. |
| `createRoute` | String \| Object | `''` | Route pushed when the page's "create" action fires (empty disables it). |
| `showEditAction` | Boolean | `false` | Show an **Edit** button in the header that opens the record's schema form (`CnFormDialog`) scoped to this record, saving through the object store and emitting `@edited`. Needs `register` + `schema` + `objectId`; hidden without them. `CnPageRenderer` sets it for every schema-bound `type:"detail"` page — the same set of records whose index tables stop offering an edit modal. Declare `config.showEditAction: false` to keep a detail page read-only. |
| `formSize` (`form-size`) | String | `'normal'` | NcDialog size for this page's create and edit form dialogs (`'small'`, `'normal'`, `'large'`). Set from the manifest as `config.formSize`. Before 2.44.0 the page passed no size, so both forms sat at `normal` however many properties the schema declared, while a manifest `open-form` header action could already ask for `large`. |
| `formColumns` (`form-columns`) | Number | `1` | How many columns the create and edit forms flow their fields into (`1` or `2`). Pair `2` with `formSize: 'large'`, or the two columns are merely two narrow ones. Textareas and JSON editors still span both, and the layout collapses back to one column below 700px. Set from the manifest as `config.formColumns`. |
| `editLabel` | String | `''` | Label for the header Edit button. Defaults to a translated "Edit". |

### Widget icons (ADR-062)

Every `config.widgets[]` def may carry `icon` (an MDI component name, e.g.
`"CheckboxMarkedOutline"`). Data widgets forward it to their card header via
`CnIcon`; content-only catalog widgets (object-list / table) render it in
their `CnWidgetWrapper` title. Together with the shared
`var(--border-radius-large, 8px)` card radius this keeps all detail-page
widgets in one visual family.

## Header actions menu

The page header's overflow menu carries Refresh plus the mandatory trio Request a feature / Report a bug / Documentation. `showReportBug` and `showDocumentation` (both `true` by default) exist for a surface that must suppress one deliberately; the shared menu resolves each target itself, so leaving them on costs nothing. The Documentation entry deep-links to this page's own section using the page id as its anchor.

## Type eyebrow and breadcrumb

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showTypeEyebrow` | `Boolean` | `true` | `false` (manifest `config.showTypeEyebrow: false`) drops the type label above the record name once the record resolves, for a header that says the type in a pill instead. |
| `breadcrumb` | `Object \| null` | `null` | A breadcrumb line above the header (manifest `config.breadcrumb`): `{ label, route?, params?, href? }` names the list the record belongs to; the record's display name follows as the current crumb. The label goes through the host translate function. |

```json
"config": { "showTypeEyebrow": false, "breadcrumb": { "label": "All cases", "route": "Cases" } }
```

A breadcrumb's label shows as text. `breadcrumb.icon` (an MDI name such as `Home`) draws that icon as the first crumb instead, with the label as its accessible name.

## Header card and header widget

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headerCard` | `Boolean` | `false` | Draws the header (pills, title, actions) as a bordered card on the surface colour (manifest `config.headerCard`), as the board's case header. Theme hooks: `--cn-detail-header-card-padding` (22px 24px), `--cn-detail-header-card-radius` (12px), `--cn-detail-header-row-gap` (22px). |
| `headerWidget` | `String` | `''` | The id of a widget in `widgets` to render inside the header, on its own row under the title and the actions, without a card of its own (manifest `config.headerWidget`). The widget leaves the body grid and its row closes up. An id that names no widget renders nothing extra. |

```json
"config": {
  "headerCard": true,
  "headerWidget": "case-stages",
  "breadcrumb": { "label": "All cases", "route": "Cases" }
}
```

Blocks such as favourites, follow and attention are placed with the layout you already have: a `layout` entry's `gridY` puts one under the tabs, and `sideColumn` takes its widget id.
