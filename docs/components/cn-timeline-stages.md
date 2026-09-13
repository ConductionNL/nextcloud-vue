import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnTimelineStages.md'

# CnTimelineStages

Visualizes sequential progression through named stages. Stages are automatically classified as **completed** (before current), **current**, or **upcoming** (after current). Supports horizontal and vertical orientations, small/medium sizes, clickable stages with keyboard navigation (roving tabindex), and ARIA roles.

## Try it

<Playground component="CnTimelineStages" />

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
| `stages` | Array | ✓ | — | Stage objects: `{ id, label, subtitle?, disabled?, blocked?, hint? }`. `id` must be unique; `subtitle` is optional secondary text. See [a stage that cannot be chosen](#a-stage-that-cannot-be-chosen) for the last three |
| `currentStage` | String \| Number | | `null` | `id` of the active stage. Stages before it are completed, stages after are upcoming. `null` = all upcoming |
| `orientation` | String | | `'horizontal'` | Layout direction: `'horizontal'` or `'vertical'` |
| `size` | String | | `'medium'` | Indicator size: `'medium'` (32px) or `'small'` (20px) |
| `clickable` | Boolean | | `false` | Whether stages emit `stage-click` and support arrow-key navigation |
| `ariaLabel` | String | | `'Progress stages'` | Accessible label for the timeline container |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `stage-click` | `{ stage, index }` | Emitted when a clickable stage is activated via click, Enter, or Space |
| `stage-blocked` | `{ stage, index }` | Emitted instead of `stage-click` when the activated stage is `disabled`. Answer it, or a click on a refused stage does nothing and says nothing |

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

### A stage that cannot be chosen

Three keys on a stage object, and they answer three different questions.

| Key | What it says | What the person sees |
|-----|--------------|----------------------|
| `disabled` | This stage cannot be chosen | Dimmed, a dashed indicator, a not-allowed cursor. It keeps its focus stop, carries `aria-disabled="true"` and emits `stage-blocked` instead of `stage-click` |
| `blocked` | A guard refused it for this record | Full contrast, the warning colour, an exclamation mark in the indicator. Still refused, still emits `stage-blocked` |
| `hint` | Why | The stage's `title`, so a mouse-over reveals it |

```vue
<CnTimelineStages
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
  ]"
  current-stage="work"
  orientation="vertical"
  :clickable="true"
  @stage-blocked="say($event.stage.hint)" />
```

Set `blocked` only on the stages a guard actually refused. A stage further down the process is not a refusal, and if every stage is orange then none of them reads as refused. The stage the record is on never takes the colour, whatever you pass: a refusal on the place the record already sits says no to a move nobody is making.

`hint` is one route to the reason, not the only one. A tooltip reaches neither a touch screen nor a keyboard, so answer `stage-blocked` as well. `CnStagesWidget` does both: it shows the sentence in a warning note card under the strip, and it keeps a copy inside the stage for a screen reader.

Vertical stages are top aligned. A stage carrying a long reason is taller than its neighbours, and centring it slid that one label out of line with the others. The connector line runs from each circle's centre to the next one down, which is a fixed distance from the top of each row, so the line stays on the circles whatever a row contains.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnTimelineStages.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnTimelineStages/CnTimelineStages.vue) and update automatically whenever the component changes.

<GeneratedRef />
