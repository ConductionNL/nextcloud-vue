CnObjectSidebar provides a standardized right sidebar with Files, Notes, Tags, Tasks, and Audit Trail tabs for any OpenRegister object. It uses `NcAppSidebar` and integrates with OpenRegister API endpoints.

It renders within the Nextcloud app layout. In the styleguide, it appears in a constrained container:

```vue
<template>
  <div style="height: 450px; width: 360px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; position: relative;">
    <CnObjectSidebar
      :open="true"
      :object-id="'obj-001'"
      object-type="contacts-contact"
      sidebar-title="Jane Smith"
      sidebar-subtitle="Contact"
      :hidden-tabs="['tasks', 'audit']"
      @update:open="() => {}" />
  </div>
</template>
```

Custom tab content via slot:

```vue
<template>
  <div style="height: 450px; width: 360px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; position: relative;">
    <CnObjectSidebar
      :open="true"
      :object-id="'obj-002'"
      object-type="projects-project"
      sidebar-title="Project Alpha"
      sidebar-subtitle="Project"
      :hidden-tabs="['tags', 'tasks', 'audit']"
      @update:open="() => {}">
      <template #tab-notes="{ objectId }">
        <div style="padding: 12px; color: var(--color-text-maxcontrast); font-size: 14px;">
          Custom notes content for object {{ objectId }}
        </div>
      </template>
    </CnObjectSidebar>
  </div>
</template>
```

With custom tab labels:

```vue
<template>
  <div style="height: 450px; width: 360px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; position: relative;">
    <CnObjectSidebar
      :open="open"
      :object-id="caseId"
      object-type="procest-case"
      sidebar-title="Case 001"
      files-label="Bijlagen"
      notes-label="Notities"
      tags-label="Labels"
      tasks-label="Taken"
      audit-trail-label="Geschiedenis"
      @update:open="open = $event" />
  </div>
</template>
<script>
export default {
  data() {
    return {
      open: true,
      caseId: 'case-001',
    }
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objectType` | String | Required | The entity type slug (e.g. `'pipelinq_lead'`, `'procest_case'`). Used as the sidebar title fallback |
| `subtitleProp` | String | `''` | Deprecated alias for `subtitle`. Use `subtitle` instead |
| `filesLabel` | String | `'Files'` | Pre-translated label for the Files tab |
| `notesLabel` | String | `'Notes'` | Pre-translated label for the Notes tab |
| `tagsLabel` | String | `'Tags'` | Pre-translated label for the Tags tab |
| `tasksLabel` | String | `'Tasks'` | Pre-translated label for the Tasks tab |
| `auditTrailLabel` | String | `'Audit trail'` | Pre-translated label for the Audit Trail tab |
