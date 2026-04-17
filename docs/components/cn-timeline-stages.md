# CnTimelineStages

Visualizes sequential progression through named stages. Stages are automatically classified as **completed** (before current), **current**, or **upcoming** (after current). Supports horizontal and vertical orientations, small/medium sizes, clickable stages with keyboard navigation (roving tabindex), and ARIA roles.

## Usage

```vue
<!-- Basic horizontal timeline -->
<CnTimelineStages
  :stages="[
    { id: 'new', label: 'New' },
    { id: 'review', label: 'In Review', subtitle: 'Since Mar 15' },
    { id: 'approved', label: 'Approved' },
    { id: 'done', label: 'Done' },
  ]"
  current-stage="review" />

<!-- Vertical, clickable — for pipeline stage selection -->
<CnTimelineStages
  :stages="pipelineStages"
  :current-stage="deal.stage"
  orientation="vertical"
  :clickable="true"
  @stage-click="onStageClick" />

<!-- Small size, custom indicator via slot -->
<CnTimelineStages :stages="stages" current-stage="active" size="small">
  <template #indicator="{ stage, state }">
    <span :class="['my-dot', `my-dot--${state}`]" />
  </template>
</CnTimelineStages>
```

```js
function onStageClick({ stage, index }) {
  updateDealStage(stage.id)
}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `stages` | Array | ✓ | — | Stage objects: `{ id, label, subtitle? }`. `id` must be unique; `subtitle` is optional secondary text |
| `currentStage` | String \| Number | | `null` | `id` of the active stage. Stages before it are completed, stages after are upcoming. `null` = all upcoming |
| `orientation` | String | | `'horizontal'` | Layout direction: `'horizontal'` or `'vertical'` |
| `size` | String | | `'medium'` | Indicator size: `'medium'` (32px) or `'small'` (20px) |
| `clickable` | Boolean | | `false` | Whether stages emit `stage-click` and support arrow-key navigation |
| `ariaLabel` | String | | `'Progress stages'` | Accessible label for the timeline container |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `stage-click` | `{ stage, index }` | Emitted when a clickable stage is activated via click, Enter, or Space |

### Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `indicator` | `{ stage, index, state }` | Custom indicator element replacing the default checkmark/dot |
| `label` | `{ stage, index, state }` | Custom label block replacing the default label + subtitle |

### Stage states

| State | Condition |
|-------|-----------|
| `'completed'` | Stage index < current stage index |
| `'current'` | Stage matches `currentStage` |
| `'upcoming'` | Stage index > current stage index |
