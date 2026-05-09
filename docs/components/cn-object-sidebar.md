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

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:open` | `boolean` | Emitted when the sidebar is closed; use with `.sync` |

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

Any other `type` value resolves against the `customComponents` registry — the explicit `customComponents` prop wins over the injected `cnCustomComponents` (mirroring `CnPageRenderer`'s pattern).

### Shared object context

Every widget and component mounted inside a custom tab receives the parent `CnObjectSidebar`'s `objectId` / `objectType` / `register` / `schema` / `apiBase` as default props (matching the context the built-in tabs receive). Per-widget `props` win on conflict, so a tab can override `objectData`, `apiBase`, etc. without losing the rest of the context.

### Backwards compatibility

Apps satisfied with the default tab set make NO changes — leave `tabs` unset and the hard-coded built-in tabs render exactly as today, including the `#tab-files` / `#tab-notes` / `#tab-tags` / `#tab-tasks` / `#tab-audit-trail` / `#extra-tabs` slot overrides. The `tabs` prop is purely additive.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnObjectSidebar.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnObjectSidebar/CnObjectSidebar.vue) and update automatically whenever the component changes.

<GeneratedRef />
