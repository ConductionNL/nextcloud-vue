CnObjectSidebar provides a standardized right sidebar with Files, Notes, Tags, Tasks, and Audit Trail tabs for any OpenRegister object. It uses `NcAppSidebar` and integrates with OpenRegister API endpoints.

It renders within the Nextcloud app layout. In the styleguide, it appears in a constrained container:

```vue
<template>
  <div style="height: 450px; width: 360px; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; position: relative;">
    <CnObjectSidebar
      :open="true"
      :object-id="'obj-001'"
      :register="'contacts'"
      :schema="'contact'"
      sidebar-title="Jane Smith"
      sidebar-subtitle="Contact"
      api-base="/index.php/apps/openregister/api"
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
      :register="'projects'"
      :schema="'project'"
      sidebar-title="Project Alpha"
      sidebar-subtitle="Project"
      api-base="/index.php/apps/openregister/api"
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
