---
sidebar_position: 23
---

# CnWizardDialog

Multi-step modal with per-step slots, back/next navigation, optional
per-step validation, and a single result phase. Each step is declared
in the `steps[]` prop (`{ id, label, optional?, icon? }`) and rendered
via a `#step-{id}` named slot with the navigation API exposed through
the slot scope.

Use [`CnFormDialog`](./cn-form-dialog.md) for single-step forms,
[`CnRichSubmitDialog`](./cn-rich-submit-dialog.md) for single-step
submit-with-files flows, and [`CnExportWizard`](./cn-export-wizard.md)
for the specific scope+format+delivery export-trigger shape.

## Try it

```vue
<template>
  <div>
    <NcButton @click="show = true">Bulk enrol</NcButton>

    <CnWizardDialog
      v-if="show"
      ref="wizard"
      dialog-title="Bulk enrol"
      :steps="steps"
      :validate="validateStep"
      @submit="onSubmit"
      @close="show = false">
      <template #step-audience="{ stepData, setStepData }">
        <CohortPicker :value="stepData.cohort" @input="v => setStepData({ cohort: v })" />
      </template>
      <template #step-course="{ stepData, setStepData }">
        <CoursePicker :value="stepData.course" @input="v => setStepData({ course: v })" />
      </template>
      <template #step-confirm="{ stepData }">
        <p>Enrol {{ stepData.cohort?.size }} learners into {{ stepData.course?.name }}?</p>
      </template>
    </CnWizardDialog>
  </div>
</template>

<script>
import { CnWizardDialog } from '@conduction/nextcloud-vue'

export default {
  components: { CnWizardDialog },
  data() {
    return {
      show: false,
      steps: [
        { id: 'audience', label: 'Audience' },
        { id: 'course',   label: 'Course'   },
        { id: 'confirm',  label: 'Confirm'  },
      ],
    }
  },
  methods: {
    validateStep(stepId, stepData) {
      if (stepId === 'audience' && !stepData.cohort) return 'Pick a cohort first.'
      if (stepId === 'course' && !stepData.course) return 'Pick a course first.'
      return true
    },
    async onSubmit(payload) {
      try {
        const { data } = await axios.post('/api/enrolments/bulk', payload)
        this.$refs.wizard.setResult({ success: true, message: `Enrolled ${data.count} learners.` })
      } catch (e) {
        this.$refs.wizard.setResult({ error: e.message })
      }
    },
  },
}
</script>
```

## Slot scope

Each `#step-{id}` slot receives:

| Field | Type | Description |
|-------|------|-------------|
| `next` | `() => Promise<void>` | Run validation + advance to the next step. |
| `back` | `() => void` | Step back. No validation. |
| `jumpTo` | `(stepId) => void` | Jump to any step. No validation. |
| `submit` | `() => Promise<void>` | Run validation + emit `@submit`. |
| `currentStep` | `Object` | The current step definition. |
| `stepIndex` | `number` | Zero-based index of the current step. |
| `totalSteps` | `number` | Total number of declared steps. |
| `stepData` | `Object` | Shared cross-step data. |
| `setStepData` | `(partial: Object) => void` | Merge `partial` into `stepData`. |
| `isFirst` | `boolean` | True on the first step. |
| `isLast` | `boolean` | True on the last step (Next → Submit label flip). |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `steps` | `Array<{id,label,optional?,icon?}>` | — *(required)* | Step declarations. Order is significant. |
| `dialogTitle` | String | `'Wizard'` | Dialog header. |
| `initialStep` | String | `''` | Step id to start on; defaults to the first step. |
| `validate` | `(stepId, stepData) => Promise<boolean\|string>` | `null` | Per-step validator. Return `true` to advance, a string to show as an error banner + block navigation. |
| `allowJumpBack` | Boolean | `true` | Allow clicking a completed-step dot to jump back. Forward jumps via the progress indicator are never allowed. |
| `defaults` | Object | `{}` | Seed values for `stepData`. |
| `cancelLabel` | String | `'Cancel'` | Cancel-button label. |
| `backLabel` | String | `'Back'` | Back-button label. |
| `nextLabel` | String | `'Next'` | Next-button label. |
| `submitLabel` | String | `'Submit'` | Final-step submit-button label. |
| `closeLabel` | String | `'Close'` | Close-button label (result phase). |
| `successText` | String | `'Done.'` | Default success-banner text when `result.message` is empty. |
| `cancellable` | Boolean | `true` | Whether the dialog can be dismissed (Cancel button, ESC, backdrop click) before reaching the result phase. `false` hides Cancel and disables all other close affordances — use for a step that must be completed, not merely skipped. The result-phase Close button is always available. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `submit` | `stepData` | User reached the final step and confirmed. |
| `step-change` | `{ stepId, stepIndex, direction }` | After every step navigation (`next`, `back`, `jump`). |
| `close` | — | Dialog was dismissed. |

## Closing and reopening

The dialog owns its own open state and closes itself for good. Handle `@close` by **unmounting** it — `v-if="show"` with `@close="show = false"` — and let a fresh mount reopen it. There is no `open` prop and no public reopen method: a still-mounted instance that has closed stays closed.

This is deliberate. `NcDialog` does not self-manage `open`: on any close it clears its internal `showModal` flag and then sets it back to `true` about 300 ms later (bookkeeping for the next open). Since it renders on `open && showModal`, a dialog that leaves `open` at its `true` default silently reopens itself after every Cancel / ESC / backdrop click. `CnWizardDialog` therefore drives `open` explicitly and pins it `false` on close, which also means it cannot be revived in place.

## Public methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setResult(result)` | `({ success?, message?, error? })` | Switch into the **terminal** result phase + clear `loading` (Close only). |
| `setError(message)` | `(string)` | **Recoverable** failure: clear `loading` and show `message` above the still-editable step so the user can fix and resubmit — without entering the result phase. Prefer this over `setResult({ error })` when the submit can be retried (e.g. a taken slug). |

The step indicator renders as numbered circles joined by connectors, with a checkmark on completed steps and the active step highlighted in the primary colour.

## Slots

- `#step-{id}` — body for each declared step (see scope table above).
- `#result-extra` — extra content rendered below the result-phase banner. Scope: `{ result }`.

## See also

- [`CnFormDialog`](./cn-form-dialog.md) — single-step schema-driven form.
- [`CnRichSubmitDialog`](./cn-rich-submit-dialog.md) — single-step rich submit (reason + files + notes).
- [`CnExportWizard`](./cn-export-wizard.md) — pre-built export-trigger wizard.
