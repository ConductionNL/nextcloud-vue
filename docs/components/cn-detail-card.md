import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDetailCard.md'

# CnDetailCard

Card container for sections on detail pages. Provides a consistent header (icon + title + optional actions), scrollable content area, and optional footer. Supports optional collapse/expand behavior.

## Try it

<Playground component="CnDetailCard" />

## Usage

```vue
<!-- Basic card -->
<CnDetailCard title="Core Information">
  <CnDetailGrid :fields="fields" />
</CnDetailCard>

<!-- With icon and header actions -->
<CnDetailCard title="Pipeline" :icon="ChartTimelineVariant">
  <template #header-actions>
    <NcButton type="tertiary" @click="editStage">Edit</NcButton>
  </template>
  <CnTimelineStages :stages="stages" :current-stage="currentStage" />
</CnDetailCard>

<!-- Collapsible card, starts collapsed -->
<CnDetailCard title="Extended Properties" :collapsible="true" :collapsed="true">
  <CnDetailGrid :fields="extraFields" />
</CnDetailCard>

<!-- Flush (no content padding) — for tables or lists that go edge-to-edge -->
<CnDetailCard title="Related Items" :flush="true">
  <CnDataTable :rows="rows" :columns="columns" />
</CnDetailCard>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title shown in the header |
| `icon` | Object \| Function | `null` | Vue component for the header icon (MDI component reference) |
| `collapsible` | Boolean | `false` | Whether the card body can be collapsed by clicking the header |
| `collapsed` | Boolean | `false` | Initial collapsed state (only applies when `collapsible` is `true`). Supports `.sync` |
| `flush` | Boolean | `false` | Remove content padding — lets tables and lists extend edge-to-edge |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:collapsed` | `boolean` | Emitted when the collapsed state changes (for use with `.sync`) |

### Slots

| Slot | Description |
|------|-------------|
| default | Card body content |
| `icon` | Custom icon element replacing the `icon` prop |
| `header-actions` | Buttons or controls placed in the right side of the header |
| `footer` | Footer content rendered below the body with a top border |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDetailCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDetailCard/CnDetailCard.vue) and update automatically whenever the component changes.

<GeneratedRef />
