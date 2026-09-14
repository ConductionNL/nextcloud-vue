Horizontal timeline — shows progress through sequential stages:

```vue
<CnTimelineStages
  :stages="[
    { id: 'intake', label: 'Intake' },
    { id: 'review', label: 'Review', subtitle: 'In progress' },
    { id: 'approval', label: 'Approval' },
    { id: 'closing', label: 'Closing' },
  ]"
  current-stage="review" />
```

Vertical orientation:

```vue
<CnTimelineStages
  orientation="vertical"
  :stages="[
    { id: 'submitted', label: 'Submitted', subtitle: '10 Jan 2024' },
    { id: 'processing', label: 'Processing', subtitle: '12 Jan 2024' },
    { id: 'approved', label: 'Approved' },
    { id: 'completed', label: 'Completed' },
  ]"
  current-stage="processing" />
```

Clickable — navigate between stages:

```vue
<template>
  <div>
    <CnTimelineStages
      :stages="stages"
      :current-stage="current"
      :clickable="true"
      @stage-click="current = $event.stage.id" />
    <p style="margin-top: 12px; font-size: 13px; color: var(--color-text-maxcontrast);">
      Current: {{ current }}
    </p>
  </div>
</template>
<script>
export default {
  data() {
    return {
      current: 'design',
      stages: [
        { id: 'discovery', label: 'Discovery' },
        { id: 'design', label: 'Design' },
        { id: 'development', label: 'Development' },
        { id: 'testing', label: 'Testing' },
        { id: 'release', label: 'Release' },
      ],
    }
  },
}
</script>
```

A stage a guard refused. `blocked` gives it the warning colour and an exclamation mark, so it does not look like the stage below it, which is simply later in the process. `hint` is the reason, on hover:

```vue
<CnTimelineStages
  orientation="vertical"
  :clickable="true"
  :stages="[
    { id: 'intake', label: 'Ontvangen' },
    { id: 'work', label: 'In behandeling' },
    {
      id: 'done',
      label: 'Afgehandeld',
      disabled: true,
      blocked: true,
      hint: 'Vereist veld ontbreekt: description',
    },
    { id: 'archive', label: 'Gearchiveerd', disabled: true },
  ]"
  current-stage="work" />
```

Answer `stage-blocked` as well. A tooltip reaches neither a touch screen nor a keyboard, so the hint alone leaves both of them with a stage that does nothing and says nothing.

Small size:

```vue
<CnTimelineStages
  size="small"
  :stages="[
    { id: 'open', label: 'Open' },
    { id: 'in-progress', label: 'In progress' },
    { id: 'review', label: 'Review' },
    { id: 'done', label: 'Done' },
  ]"
  current-stage="in-progress" />
```

Custom aria label and custom indicator slot:

```vue
<CnTimelineStages
  aria-label="Case progress stages"
  :stages="[
    { id: 'new', label: 'New' },
    { id: 'open', label: 'Open' },
    { id: 'closed', label: 'Closed' },
  ]"
  current-stage="open">
  <template #indicator="{ stage, index, state }">
    <span :title="state">{{ index + 1 }}</span>
  </template>
</CnTimelineStages>
```

## Additional props and slots

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `ariaLabel` | String | `'Progress stages'` | Accessible label for the timeline container (`aria-label` on the root element) |

| Slot | Scope | Description |
|------|-------|-------------|
| `indicator` | `{ stage, index, state }` | Override the indicator's inner content (checkmark/dot). The 32px (or 20px for `size="small"`) circular wrapper is preserved, so custom content inherits sizing and stays aligned with the track line. `state` is `'completed'`, `'current'`, or `'upcoming'` |
