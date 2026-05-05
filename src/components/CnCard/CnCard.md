Basic — title, description, and stats:

```vue
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 700px;">
  <CnCard
    title="Open Register"
    description="Structured data management for Nextcloud apps"
    :stats="[
      { label: 'Schemas', value: 12 },
      { label: 'Objects', value: '4.8k' },
    ]" />
  <CnCard
    title="Open Catalogi"
    description="Publication and discovery platform for government data"
    :stats="[
      { label: 'Publications', value: 284 },
      { label: 'Categories', value: 8 },
    ]" />
  <CnCard
    title="Pipelinq"
    description="Process automation and workflow management"
    :stats="[
      { label: 'Pipelines', value: 5 },
      { label: 'Runs', value: 1420 },
    ]" />
</div>
```

With icon, iconSize, and titleTooltip:

```vue
<div style="max-width: 280px;">
  <CnCard
    title="Database source"
    description="PostgreSQL production database"
    title-tooltip="PostgreSQL — click to view details"
    :icon-size="24"
    :stats="[{ label: 'Tables', value: 48 }]" />
</div>
```

With labels and active state:

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 480px;">
    <CnCard
      title="Production"
      description="Main production environment"
      :labels="[{ text: 'Active', variant: 'success' }, { text: 'Default', variant: 'warning' }]"
      :active="true"
      active-variant="success" />
    <CnCard
      title="Staging"
      description="Pre-production testing environment"
      :labels="[{ text: 'Inactive', variant: 'default' }]" />
  </div>
</template>
```

With actions slot:

```vue
<div style="max-width: 280px;">
  <CnCard title="My pipeline" description="Sales automation">
    <template #actions>
      <NcActions>
        <NcActionButton @click="() => {}">Edit</NcActionButton>
        <NcActionButton @click="() => {}">Delete</NcActionButton>
      </NcActions>
    </template>
  </CnCard>
</div>
```

With footer tags and links:

```vue
<div style="max-width: 280px;">
  <CnCard
    title="Open Register"
    description="A Nextcloud app for structured data"
    :tags="['vue', 'nextcloud', 'open-source']"
    :footer-links="[{ url: 'https://github.com', label: 'GitHub' }]" />
</div>
```

Controlling description line clamp via descriptionLines:

```vue
<div style="max-width: 280px;">
  <CnCard
    title="Long description"
    description="This is a very long description that should be truncated after two lines to keep the card compact and readable."
    :description-lines="2" />
</div>
```

Clickable — hover effect and click event:

```vue
<template>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 500px;">
    <CnCard
      v-for="item in items"
      :key="item.id"
      :title="item.title"
      :description="item.description"
      :clickable="true"
      @click="selected = item.title" />
  </div>
  <p style="margin-top: 8px; font-size: 13px;">Clicked: {{ selected || '—' }}</p>
</template>
<script>
export default {
  data() {
    return {
      selected: '',
      items: [
        { id: 1, title: 'Reports', description: 'View quarterly reports' },
        { id: 2, title: 'Invoices', description: 'Manage customer invoices' },
        { id: 3, title: 'Contacts', description: 'Customer contact list' },
      ],
    }
  },
}
</script>
```

## Additional props and slots

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `titleTooltip` | String | `''` | Tooltip for the title text. Falls back to the title itself when the text is truncated (ellipsized). |
| `icon` | Object\|Function | `null` | Icon component (e.g. imported MDI icon) rendered before the title via `<component :is>` |
| `iconSize` | Number | `20` | Icon size in pixels |
| `descriptionLines` | Number | `3` | Maximum lines before the description is truncated with CSS `line-clamp` |

| Slot | Description |
|------|-------------|
| `icon` | Override the icon rendered in the card title (replaces the `icon` prop) |
| `actions` | Action controls rendered in the top-right corner of the card header |
