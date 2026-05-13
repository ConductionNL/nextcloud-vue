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

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `#icon` | — | Custom icon (replaces CnIcon) |
| `#header-actions` | — | Action buttons in the header (right side) |
| `#error` | — | Custom error state content |
| `#error-actions` | — | Extra buttons inside the default error state |
| `#empty` | — | Custom empty state content |
| `#empty-actions` | — | Extra buttons inside the default empty state |
| `#stats-header` | — | Custom header above the stats table (replaces default h3) |
| `#stats-rows` | — | Custom table body rows (replaces auto-generated rows) |
| `#default` | — | Main content below the stats table |
| `#sections` | — | Additional content below the default slot |
| `#footer` | — | Footer content (separated by a border) |

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

## Schema-driven mode

Setting `register` + `schema` + `objectId` (typically from a manifest
`type: "detail"` page entry — `CnPageRenderer` forwards them as props
from `page.config` and `$route.params`) opts CnDetailPage into the
**schema-driven contract**:

1. The page lazy-resolves `useObjectStore()` (or honours an explicit
   `objectStore` prop) and registers the type slug
   `${register}-${schema}` with the canonical 4-arg signature
   (`slug, schemaId, registerId, { registerSlug, schemaSlug }`).
2. On mount and on every `register` / `schema` / `objectId` change, it
   calls `objectStore.fetchObject(slug, objectId)` and
   `objectStore.fetchSchema(slug)` in parallel.
3. When the object has loaded AND the default slot is empty AND the
   grid-layout mode is not active, the body auto-renders
   `<CnObjectDataWidget>` followed by `<CnObjectMetadataWidget>` for
   the loaded object — no further wiring required.
4. The `sidebarTabs` prop is forwarded via the injected
   `objectSidebarState` to whatever `<CnObjectSidebar>` the host App
   renders (or the one `CnAppRoot` auto-mounts at NcContent level when
   the consumer doesn't provide their own).

Manifest authors get a working detail surface from a single config
block:

```json
{
  "id": "VirtualAppDetail",
  "route": "/applications/:objectId",
  "type": "detail",
  "title": "Virtual app",
  "config": {
    "register": "openbuilt",
    "schema": "application",
    "actionsComponent": "ApplicationDetailActions",
    "sidebarTabs": [
      { "id": "overview", "label": "Overview", "widgets": [{"type": "data"}, {"type": "metadata"}] },
      { "id": "manifest", "label": "Manifest", "component": "ApplicationManifestTab" }
    ]
  }
}
```

To override the auto-body, pass content in the default slot — slot
content always wins and the auto-widgets are suppressed.

To override the auto-fetched object, pass an explicit `objectStore`
prop (e.g. an app-scoped store with custom interceptors). The page
calls the same `registerObjectType` + `fetchObject` lifecycle against
your store.

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

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDetailPage.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDetailPage/CnDetailPage.vue) and update automatically whenever the component changes.

<GeneratedRef />
