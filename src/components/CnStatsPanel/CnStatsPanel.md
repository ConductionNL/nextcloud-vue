Stack layout — horizontal stat blocks in a vertical list:

```vue
<CnStatsPanel
  :sections="[
    {
      id: 'overview',
      title: 'Overview',
      type: 'stats',
      layout: 'stack',
      items: [
        { title: 'Total objects', count: 4821, variant: 'primary' },
        { title: 'Published', count: 4200, variant: 'success' },
        { title: 'Draft', count: 421, variant: 'warning' },
        { title: 'Archived', count: 200, variant: 'default' },
      ],
    },
  ]" />
```

Grid layout — KPI grid inside a section:

```vue
<CnStatsPanel
  :sections="[
    {
      id: 'kpis',
      title: 'Key metrics',
      type: 'stats',
      layout: 'grid',
      columns: 2,
      items: [
        { title: 'Schemas', count: 12, variant: 'primary' },
        { title: 'Registers', count: 3, variant: 'default' },
        { title: 'Users', count: 28, variant: 'success' },
        { title: 'API calls', count: 15240, variant: 'default' },
      ],
    },
  ]" />
```

Multiple sections:

```vue
<CnStatsPanel
  :sections="[
    {
      id: 'data',
      title: 'Data',
      type: 'stats',
      layout: 'stack',
      items: [
        { title: 'Objects', count: 1842 },
        { title: 'Schemas', count: 7 },
      ],
    },
    {
      id: 'activity',
      title: 'Activity',
      type: 'stats',
      layout: 'stack',
      items: [
        { title: 'Created today', count: 12, variant: 'success' },
        { title: 'Updated today', count: 45, variant: 'primary' },
      ],
    },
  ]" />
```

Loading state — `loadingLabel` is shown next to the spinner:

```vue
<CnStatsPanel :sections="[]" :loading="true" loading-label="Fetching statistics..." />
```

Empty section — `emptyLabel` is shown when a section has no items:

```vue
<CnStatsPanel
  empty-label="No data available for this period."
  :sections="[
    { id: 'empty', title: 'No data', type: 'stats', layout: 'stack', items: [] },
  ]" />
```

With `header` slot — add a register selector or date picker above the sections:

```vue
<template>
  <CnStatsPanel :sections="sections">
    <template #header>
      <NcSelect
        v-model="selectedRegister"
        :options="registerOptions"
        input-label="Register"
        placeholder="Select register" />
    </template>
  </CnStatsPanel>
</template>
<script>
import { NcSelect } from '@nextcloud/vue'
export default {
  components: { NcSelect },
  data() {
    return {
      selectedRegister: null,
      registerOptions: [
        { label: 'Decisions', value: 'decisions' },
        { label: 'Contacts', value: 'contacts' },
      ],
      sections: [],
    }
  },
}
</script>
```

## Additional props

| Prop | Type | Default | Description |
|---|---|---|---|
| `loadingLabel` | `String` | `'Loading...'` | Text shown next to the spinner during the panel-level loading state, and in section-level loading states |
| `emptyLabel` | `String` | `'No data available'` | Default text shown when a section has no items; can be overridden per section via `section.emptyLabel` |

## Slots

| Slot | Description |
|---|---|
| `header` | Content rendered above all sections (e.g. a register/date selector). Only rendered when the slot is provided. |
| `footer` | Content rendered below all sections. Only rendered when the slot is provided. |
| `section-{id}` | Override the rendering of an entire section. Receives `{ section }` as scope. |
| `item-icon-{sectionId}` | Custom icon for list-section items. Receives `{ item }` as scope. |
| `item-subname-{sectionId}` | Custom subname for list-section items. Receives `{ item }` as scope. |
