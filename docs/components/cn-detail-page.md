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
| `sidebarTabs` | Array | `[]` | Tab definitions for the host App's `CnObjectSidebar`. Forwarded via the injected `objectSidebarState`; mirrors `sidebar.tabs` / `sidebarProps.tabs` but lives at the top level so the manifest's `config.sidebarTabs` flows in directly. Empty array → the consumer's `CnObjectSidebar` falls back to its default tab set. |
| `sidebarProps` | Object | `{}` | Extra sidebar configuration forwarded to `CnObjectSidebar` (`register`, `schema`, `hiddenTabs`, `title`, `subtitle`, `tabs`). Set `sidebarProps.tabs` to an open-enum tab array to drive the host app's mounted `CnObjectSidebar` from `manifest.json` — see [CnObjectSidebar custom tabs](./cn-object-sidebar.md#custom-tabs). The array flows through the existing `objectSidebarState` provide/inject channel. **Note:** when both `sidebar` (Object) AND `sidebarProps` set the same field, the Object form wins and a `console.warn` lists the conflicting fields once per component instance. |
| `error` | Boolean | `false` | Error state |
| `errorMessage` | String | `'An error occurred'` | Message shown in error state |
| `onRetry` | Function | `null` | Callback for retry button in error state. If null, no retry button shown. |
| `retryLabel` | String | `'Retry'` | Retry button text |
| `empty` | Boolean | `false` | Empty state |
| `emptyLabel` | String | `'No data available'` | Message shown in empty state |
| `statsTitle` | String | `''` | Title above the statistics table |
| `statsColumns` | Array | `[]` | Column defs for stats table: `[{ key: string, label: string, align?: 'left'\|'center'\|'right' }]` |
| `statsRows` | Array | `[]` | Row data for stats table (objects keyed by column keys; set `indent: true` for sub-row styling) |
| `maxWidth` | String | `'1200px'` | Maximum width of the page content |
| `lifecycleActions` | Object \| null | `null` | **Declarative lifecycle/transition buttons.** When set, renders status-gated transition buttons in the page header driven by the object's `x-openregister-lifecycle`. `{ field?: 'status' }` fetches the allowed transitions live from OpenRegister's `/available-actions` endpoint; an explicit `{ transitions: [{ from, to, action, label, confirm?, variant? }] }` is filtered client-side by the object's current state. See [CnLifecycleActions](./cn-lifecycle-actions.md). |
| `relatedCollections` | Array | `[]` | **Declarative related-object list sections** rendered below the detail body. Each entry `{ title?, register, schema, filter?, columns?, sort?, limit?, rowRoute? }` renders a titled `CnObjectListWidget` scoped to this object via `@objectId` / `@object.<field>` tokens. See [CnRelatedCollections](./cn-related-collections.md). |
| `summaryAggregates` | Array | `[]` | **Declarative cross-schema summary chips** in the header. Each entry `{ label, register, schema, metric?, field?, filter?, format? }` runs one count/sum/avg over a related schema scoped to this object. See [CnSummaryAggregates](./cn-summary-aggregates.md). |
| `relationLinks` | Array | `[]` | **Declarative relation-link actions.** Each entry `{ label?, register, schema, fkField, labelField?, allowCreate?, title?, selectLabel? }` renders a button that opens a search-and-link modal which patches a foreign key on this object. See [CnRelationLinkModal](./cn-relation-link-modal.md). |
| `bodyWidgets` | Array | `[]` | **Declarative IN-BODY sections.** Each entry `{ id?, component, title?, props?, placement?, colSpan? }` renders a REGISTERED host-app component as a titled section in the page **body** (not the sidebar), with the object/page context injected. `component` is a registry name resolved from the app's v2 `registry` (any kind exposing a `.component`, e.g. `kind:"section"` / `kind:"widget"`) or the legacy `customComponents` map — **no sidebar tab is required**. `props` values are token-resolved (`@objectId`, `@object.<field>`, `@workspace.<key>`, `@config.<key>`; unset optional `@…?` tokens are dropped). `placement` is `before-body` \| `after-data` \| `after-related` \| `end` (default `end`). `colSpan` (1–12) lays sections out on a grid when several share a placement. The loaded object + objectId are also `provide`d on `cnSectionContext` so a host component can inject them instead of taking props. A section whose component can't be resolved, or that throws while rendering, degrades to an inline error and never breaks the page. See [CnBodySections](./cn-body-sections.md). |
| `appConfig` | Object | `{}` | **Page-level app config** exposed to declarative widget / section config via the **`@config.<key>` token** and `provide`d on `cnAppConfig`. Lets a stat widget's `format: { style: 'currency', currency: '@config.currency' }` format with a configured value (e.g. the reporting currency a setup wizard captures) instead of a hard-coded `EUR`, and an endpoint KPI's URL / params + filter values interpolate `@config.<key>`. A manifest renderer typically seeds it from `loadState(appId, 'config', {})`. Backwards-compatible: a literal `"EUR"` still works, and an unset required `@config.<key>` falls back to the format default. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `transitioned` | `{ action, to, object }` | A declarative lifecycle transition (from `lifecycleActions`) succeeded on this page's object. |
| `relation-linked` | `object` | A `relationLinks` action patched a foreign key on this page's object; payload is the updated object. |
| `related-row-click` | `{ collection, row, index }` | A row in a `relatedCollections` section was clicked. |
| `layout-change` | `Array` | A widget in the body grid was dragged or resized in edit mode. Payload is the updated layout array. The sibling `update:layout` event fires with the same payload so an explicit-layout page can use `:layout.sync`. |
| `widget-config-change` | `object \| null` | A body-grid widget's config was saved via the cog editor (the widget def), or the widget was removed (`null`). |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#icon` | — | Custom icon (replaces CnIcon) |
| `#header-actions` | — | Action buttons in the header (right side) |
| `#translation-badge` | `{ object }` | Replace the default [`CnTranslatedBadge`](./cn-translated-badge.md) rendered between the title and description when the resolved object's `_translationMeta.translatedFrom` is set. The badge auto-hides on source-of-truth objects, so consumers don't need to gate the slot. Introduced by the `cn-detail-translation-aware-surfacing` change. |
| `#error` | — | Custom error state content |
| `#error-actions` | — | Extra buttons inside the default error state |
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
- **Edit mode.** When the page is in OpenBuild edit mode (injected
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

`CnDetailPage` auto-subscribes to live updates for the current object when both `objectStore` and (`objectType` + `objectId`) are provided. This wires [`useObjectSubscription`](../utilities/composables/use-object-subscription.md) into the page lifecycle so users see remote changes without polling — including remote pessimistic locks.

When the cached `@self.locked` block indicates another user holds the lock, `CnDetailPage` mounts [`CnLockedBanner`](./cn-locked-banner.md) above the content. The banner renders only when `lockedByMe === false`.

Two opt-out props:

| Prop | Default | Behaviour |
|------|---------|-----------|
| `subscribe` | `true` | When `false`, skips the auto-subscribe (useful for read-only / archive views). |
| `objectStore` | `null` | Pinia store instance. When omitted, both subscribe and lock-state are skipped. Pass the result of `useObjectStore()` from your app. |

See [`useObjectLock`](../utilities/composables/use-object-lock.md) for the lock state contract; the lib does not yet auto-acquire on edit-mode toggle (planned for a follow-up cycle that wires the form dialogs).

## Integration props (AD-19)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `surface` | String | `'detail-page'` | Rendering surface forwarded to integration widgets in the grid layout (widget defs with `type === 'integration'`). Drives the AD-19 surface fallback. |
| `integrationContext` (`integration-context`) | Object \| null | `null` | Object context `{ register, schema, objectId }` forwarded to integration widgets. When omitted it is derived from `sidebarProps.register` / `sidebarProps.schema` (or `objectType`) and `objectId`. |

## Built-in Actions menu

The header carries the shared [`CnActionsMenu`](./cn-actions-menu) overflow `…` — **Refresh**, **Documentation**, and **Request a feature** — after any `#actions` slot content. Request-a-feature is **on by default**; **Refresh is shown only when it will do something** — `showRefresh` is tri-state (`true`/`false` force it; the default `null` is **auto**: shown when a consumer attached an `@refresh` listener *or* the page is in schema-driven mode and can self-fetch). A legacy `objectType`-mode page that never wires `@refresh` therefore shows no dead Refresh button. Force it with `:show-refresh="true"`/`false`; opt out of Request-a-feature with `:show-request-feature="false"`.

- **Refresh** emits `@refresh` and, unless the host calls `event.preventDefault()`, fires the `cn:page:refresh` event-bus channel with `{ widgetId, title }`.
- **Documentation** renders only when `documentationUrl` is set, opening it in a new tab.
- **Request a feature** opens `CnSuggestFeatureModal` with `surface: "detail:<id>"` when mounted under `CnAppRoot`.

Set `:page-id` for a stable id/surface (it otherwise falls back to a slugified `title`). All the menu props are forwarded to [`CnActionsMenu`](./cn-actions-menu):

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

### Widget icons (ADR-062)

Every `config.widgets[]` def may carry `icon` (an MDI component name, e.g.
`"CheckboxMarkedOutline"`). Data widgets forward it to their card header via
`CnIcon`; content-only catalog widgets (object-list / table) render it in
their `CnWidgetWrapper` title. Together with the shared
`var(--border-radius-large, 8px)` card radius this keeps all detail-page
widgets in one visual family.
