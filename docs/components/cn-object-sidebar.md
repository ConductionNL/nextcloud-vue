import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnObjectSidebar.md'

# CnObjectSidebar

Right sidebar for entity detail pages. Provides standardized tabs — Files, Notes, Tags, Tasks, and Audit Trail — that integrate with OpenRegister API endpoints bridging to Nextcloud-native APIs. Each tab is optional and independently overridable via slots.

**Wraps**: NcAppSidebar, NcAppSidebarTab

## Try it

<Playground component="CnObjectSidebar" />

## Tabs

| Tab ID | Label | Content |
|--------|-------|---------|
| `files` | Files | File attachments via `CnFilesTab` |
| `notes` | Notes | Notes list and add form via `CnNotesTab` |
| `tags` | Tags | Tag management via `CnTagsTab` |
| `tasks` | Tasks | Task list via `CnTasksTab` |
| `auditTrail` | Audit Trail | Change history via `CnAuditTrailTab` |

## Usage

```vue
<!-- Basic usage -->
<CnObjectSidebar
  object-type="pipelinq_lead"
  :object-id="lead.id"
  :register="registerConfig.register"
  :schema="registerConfig.schema" />

<!-- Hide specific tabs -->
<CnObjectSidebar
  object-type="pipelinq_lead"
  :object-id="lead.id"
  :hidden-tabs="['tasks', 'tags']" />

<!-- Override a tab with custom content -->
<CnObjectSidebar object-type="pipelinq_lead" :object-id="lead.id">
  <template #tab-notes="{ objectId }">
    <MyCustomNotesComponent :id="objectId" />
  </template>
</CnObjectSidebar>

<!-- Add an extra custom tab -->
<CnObjectSidebar object-type="pipelinq_lead" :object-id="lead.id">
  <template #extra-tabs>
    <NcAppSidebarTab id="relations" name="Relations" :order="6">
      <template #icon><LinkVariant :size="20" /></template>
      <RelationsList :object-id="lead.id" />
    </NcAppSidebarTab>
  </template>
</CnObjectSidebar>
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `objectType` | String | ✓ | — | Entity type identifier (e.g. `'pipelinq_lead'`) — used as the sidebar title fallback |
| `objectId` | String | ✓ | — | Object UUID passed to all tab components |
| `register` | String | | `''` | OpenRegister register ID |
| `schema` | String | | `''` | OpenRegister schema ID |
| `objectData` | Object | | `null` | The loaded object, forwarded to prop-driven tab widgets (the `data` / `metadata` built-ins) as `objectData`. The sidebar is otherwise coordinate-based; hosts like `CnDetailPage` (via `CnAppRoot`) publish the loaded object here. |
| `objectSchema` | Object | | `null` | The resolved JSON Schema object, forwarded to the `data` built-in tab widget (which needs the schema definition, not the `schema` slug). Published by hosts like `CnDetailPage` (via `CnAppRoot`). |
| `hiddenTabs` | Array | | `[]` | Tab IDs to hide: `'files'`, `'notes'`, `'tags'`, `'tasks'`, `'auditTrail'` |
| `open` | Boolean | | `true` | Whether the sidebar is visible |
| `title` | String | | `''` | Sidebar title (defaults to `objectType`) |
| `subtitle` | String | | `''` | Sidebar subtitle |
| `subtitleProp` | String | | `''` | **Deprecated** — use `subtitle` instead |
| `apiBase` | String | | `'/apps/openregister/api'` | Base URL for OpenRegister API calls |
| `filesLabel` | String | | `'Files'` | Files tab label |
| `notesLabel` | String | | `'Notes'` | Notes tab label |
| `tagsLabel` | String | | `'Tags'` | Tags tab label |
| `tasksLabel` | String | | `'Tasks'` | Tasks tab label |
| `auditTrailLabel` | String | | `'Audit Trail'` | Audit Trail tab label |
| `tabs` | Array | | `null` | Open-enum tab definitions `[\{ id, label, icon?, widgets?, component?, order? \}]`. When set with at least one entry, REPLACES the hard-coded built-in tab set. See [Custom tabs](#custom-tabs) below. |
| `customComponents` | Object | | `null` | Custom-component registry for tab `component` names and unknown widget `type` values. Falls back to the injected `cnCustomComponents` from a `CnAppRoot` ancestor. |
| `requested-tab` | String | | `null` | Externally-requested active tab id — lets a host deep-link into a specific leaf, e.g. a 'Linked apps' row opening the Mails tab. |

A tab's `component` name is resolved against the v2 component registry (`cnRegistry` inject from `CnAppRoot`, ADR-036) **first** — any kind-tagged entry with a `component` field resolves, including `kind: "page"` tab components — then falls back to the legacy `customComponents` map. This lets apps that migrated their sidebar-tab components into `registry.js` (the procest pattern) keep rendering tabs without duplicating them in `customComponents`.

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:open` | `boolean` | Emitted when the sidebar is closed; use with `.sync` |
| `mention` | `{ objectId, register, schema, noteId, mentionedUserIds }` | Forwarded unchanged from the built-in Notes tab after a note containing at least one `@mention` was created or edited. `mentionedUserIds` is the unique list of mentioned Nextcloud user ids. nc-vue is a frontend library and never dispatches notifications itself — the consuming app listens to this event and creates Nextcloud notifications from its own backend (e.g. `INotificationManager` in the controller that persists the note). Not emitted when the saved note contains no mentions, nor when the Notes tab is overridden via the `tab-notes` slot. |

The Notes tab's composer supports `@mention` autocomplete (backed by the core `core/autocomplete/get` OCS endpoint) and stores mentions inline in the note text as `@userId` / `@"user id"` — the same convention as Nextcloud Comments/Talk. Stored mentions render as highlighted chips with the user's display name, degrading to the raw id for unknown/deleted users.

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `tab-files` | `{ objectId, objectType }` | Override the Files tab content |
| `tab-notes` | `{ objectId, objectType }` | Override the Notes tab content |
| `tab-tags` | `{ objectId, objectType }` | Override the Tags tab content |
| `tab-tasks` | `{ objectId, objectType }` | Override the Tasks tab content |
| `tab-audit-trail` | `{ objectId, objectType }` | Override the Audit Trail tab content |
| `extra-tabs` | — | Additional `NcAppSidebarTab` elements appended after the built-in tabs |

## Custom tabs

The `tabs` prop opens up the closed-enum tab set so apps can drive `CnObjectSidebar` directly from `manifest.json` (`pages[].config.sidebarProps.tabs`). When `tabs` is set with at least one entry, the built-in tabs (Files / Notes / Tags / Tasks / Audit Trail) do NOT render — the consumer-supplied array drives the UI.

```vue
<CnObjectSidebar
  object-type="decision"
  :object-id="decisionId"
  :tabs="[
    { id: 'overview', label: 'Overview', icon: 'eye',
      widgets: [
        { type: 'data',     props: { schema, objectData } },
        { type: 'metadata', props: { objectData } },
      ] },
    { id: 'related', label: 'Related', icon: 'link',
      component: 'MyRelatedTab' },
  ]"
  :custom-components="{ MyRelatedTab }" />
```

### Tab definition shape

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Required. Unique within the array; used for active-tab tracking. |
| `label` | String | Required. Display label (i18n key already resolved by the consumer). |
| `icon` | String | Optional MDI icon name; rendered via `CnIcon`. |
| `widgets` | Array | Optional. List of `\{ type, props? \}` widget specs (see below). |
| `component` | String | Optional. Registry name resolved against `customComponents`. Mutually exclusive with `widgets` — when both are set, `component` wins and a `console.warn` is logged. |
| `order` | Number | Optional. Defaults to array index + 1. |

### Built-in widget types

| Widget `type` | Resolved component | Required props |
|---------------|--------------------|---------------|
| `data` | [`CnObjectDataWidget`](./cn-object-data-widget.md) | `schema`, `objectData` (forward via per-widget `props`) |
| `metadata` | [`CnObjectMetadataWidget`](./cn-object-metadata-widget.md) | `objectData` |
| `audit` / `audit-trail` | [`CnAuditTrailTab`](./cn-object-sidebar.md) | — (register / schema / objectId flow from the shared context) |
| `object-table` | [`CnWidgetObjectTable`](./cn-widget-object-table.md) | `source` **or** `endpointSource`, `columns` (forward via per-widget `props`) |

Any other `type` value resolves against the `customComponents` registry — the explicit `customComponents` prop wins over the injected `cnCustomComponents` (mirroring `CnPageRenderer`'s pattern).

The `object-table` type (#89) renders a declarative list scoped to the sidebar's parent object — its `source.filter` resolves `@objectId` / `@object.<field>` tokens against the object context the sidebar provides (see [Shared object context](#shared-object-context)). This is how a detail page's ZGW-style relation tab (e.g. a zaak's *besluiten*, filtered by `{ zaak: "@objectId" }`) renders with no bespoke component:

```js
tabs: [{
  id: 'besluiten',
  label: 'Besluiten',
  widgets: [{
    type: 'object-table',
    props: {
      source: { register: 'ztc', schema: 'besluit', filter: { zaak: '@objectId' } },
      columns: [{ key: 'identificatie', label: 'Besluit' }, { key: 'datum', label: 'Datum' }],
    },
  }],
}]
```

### Shared object context

Every widget and component mounted inside a custom tab receives the parent `CnObjectSidebar`'s `objectId` / `objectType` / `register` / `schema` / `apiBase` as default props (matching the context the built-in tabs receive). Per-widget `props` win on conflict, so a tab can override `objectData`, `apiBase`, etc. without losing the rest of the context.

For widgets that resolve `@objectId` / `@object.<field>` tokens through injection rather than props (the `object-table` built-in), `CnObjectSidebar` also **provides** a reactive `cnObjectContext` (`{ objectId, object, register, schema }`) seeded from its own props — mirroring `CnDetailPage`. When the sidebar is nested inside a `CnDetailPage` that already provides a richer context (with the loaded `object`), the sidebar defers to the ancestor so `@object.<field>` keeps resolving; standalone, it seeds `@objectId` + register/schema from its props.

### Backwards compatibility

Apps satisfied with the default tab set make NO changes — leave `tabs` unset and the hard-coded built-in tabs render exactly as today, including the `#tab-files` / `#tab-notes` / `#tab-tags` / `#tab-tasks` / `#tab-audit-trail` / `#extra-tabs` slot overrides. The `tabs` prop is purely additive.

## Live updates (collaborative editing)

`CnObjectSidebar` auto-subscribes to live updates for the active object when both `objectStore` and (`objectType` + `objectId`) are provided. This wires [`useObjectSubscription`](../utilities/composables/use-object-subscription.md) into the sidebar lifecycle so the cached object stays fresh as remote users edit, and downstream tabs (`CnObjectDataWidget`, `CnAuditTrailTab`, etc.) re-render reactively without polling.

| Prop | Default | Behaviour |
|------|---------|-----------|
| `subscribe` | `true` | When `false`, skips the auto-subscribe (useful for read-only / archive surfaces). |
| `objectStore` | `null` | Pinia store instance. When omitted, the auto-subscribe is skipped. |

The locked-banner UX lives on [`CnDetailPage`](./cn-detail-page.md) for v1 — sidebars host so many editor surfaces (each tab) that the banner would compete with tab content. Consumers needing lock UX inside a sidebar tab should consume [`useObjectLock`](../utilities/composables/use-object-lock.md) directly inside the tab component.

## Integration registry props (AD-19)

| Prop | Type | Default | Notes |
|---|---|---|---|
| `useRegistry` (`use-registry`) | Boolean | `true` | Use the pluggable integration registry (ADR-019) to drive the tabs — one tab per provider registered on `window.OCA.OpenRegister.integrations`. The canonical five built-ins (files / notes / tags / tasks / audit-trail) ship as providers in `builtinIntegrations` and are registered by OpenRegister's bootstrap, so the default surface is unchanged for apps that register them. Set `false` to opt back into the legacy hardcoded-tabs path (renders the five built-in tabs directly and supports `#tab-<id>` slot overrides) — for consumers that don't call `registerBuiltinIntegrations()`. `hiddenTabs` / `excludeIntegrations` apply in both modes. Mutually exclusive with the open-enum `tabs` prop — `tabs` wins when both are set. |
| `excludeIntegrations` (`exclude-integrations`) | String[] | `[]` | Integration ids to exclude when rendering registry-driven tabs. Mirrors `hiddenTabs` for the legacy mode. |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnObjectSidebar.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnObjectSidebar/CnObjectSidebar.vue) and update automatically whenever the component changes.

<GeneratedRef />
