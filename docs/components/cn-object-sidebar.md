# CnObjectSidebar

Right sidebar for entity detail pages. Provides standardized tabs — Files, Notes, Tags, Tasks, and Audit Trail — that integrate with OpenRegister API endpoints bridging to Nextcloud-native APIs. Each tab is optional and independently overridable via slots.

**Wraps**: NcAppSidebar, NcAppSidebarTab

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
| `apiBase` | String | | `'/apps/openregister/api'` | Base URL for OpenRegister API calls |
| `filesLabel` | String | | `'Files'` | Files tab label |
| `notesLabel` | String | | `'Notes'` | Notes tab label |
| `tagsLabel` | String | | `'Tags'` | Tags tab label |
| `tasksLabel` | String | | `'Tasks'` | Tasks tab label |
| `auditTrailLabel` | String | | `'Audit Trail'` | Audit Trail tab label |

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
