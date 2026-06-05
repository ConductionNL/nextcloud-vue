---
sidebar_position: 22
---

# CnRichSubmitDialog

Single-screen rich-submit modal with a reason taxonomy, optional
free-text notes, and optional file attachments (with `accept` /
max-files / max-size constraints). For "submit work" / "submit
excuse" / "submit appeal" flows where the submission carries a
reason from a closed taxonomy plus context.

Use [`CnFormDialog`](./cn-form-dialog.md) for schema-driven forms,
[`CnWizardDialog`](./cn-wizard-dialog.md) for multi-step flows.

## Try it

```vue
<template>
  <div>
    <NcButton @click="show = true">Submit work</NcButton>

    <CnRichSubmitDialog
      v-if="show"
      ref="submit"
      dialog-title="Submit work"
      :reasons="reasons"
      :show-files="true"
      :files-required="true"
      :files-accept="'.pdf,.docx,.zip'"
      :max-files="3"
      :max-size-mb="20"
      :late-warning="lateWarning"
      @confirm="onSubmit"
      @close="show = false" />
  </div>
</template>

<script>
import { CnRichSubmitDialog } from '@conduction/nextcloud-vue'

export default {
  components: { CnRichSubmitDialog },
  data() {
    return {
      show: false,
      reasons: [
        { value: 'complete',  label: 'Final submission' },
        { value: 'draft',     label: 'Draft (request feedback)' },
        { value: 'resubmit',  label: 'Resubmission after feedback' },
      ],
    }
  },
  computed: {
    lateWarning() {
      return this.assignment.deadline < Date.now()
        ? 'This submission is past the deadline; a late penalty may apply.'
        : ''
    },
  },
  methods: {
    async onSubmit({ reason, notes, files }) {
      const fd = new FormData()
      fd.append('reason', reason)
      fd.append('notes', notes)
      files.forEach((f) => fd.append('files', f))
      try {
        const { data } = await axios.post(`/api/assignments/${id}/submissions`, fd)
        this.$refs.submit.setResult({ success: true, message: 'Submitted.' })
      } catch (e) {
        this.$refs.submit.setResult({ error: e.message })
      }
    },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dialogTitle` | String | `'Submit'` | Dialog header. |
| `description` | String | `''` | Optional intro text. |
| `reasons` | `Array<string\|{value,label,description?}>` | `[]` | Reason taxonomy entries. |
| `reasonRequired` | Boolean | `false` | Whether a reason must be picked to enable Submit. |
| `reasonLabel` | String | `'Reason'` | Label preceding the reason list. |
| `showNotes` | Boolean | `true` | Whether to render the notes textarea. |
| `notesRequired` | Boolean | `false` | Whether notes are required to enable Submit. |
| `notesLabel` | String | `'Notes'` | Notes textarea label. |
| `notesPlaceholder` | String | `''` | Notes textarea placeholder. |
| `showFiles` | Boolean | `false` | Whether to render the file input. |
| `filesRequired` | Boolean | `false` | Whether at least one file is required. |
| `filesLabel` | String | `'Attachments'` | Files field label. |
| `filesHint` | String | `''` | Files field hint text. |
| `filesAccept` | String | `''` | `accept` attribute for the file input. |
| `maxFiles` | Number | `0` | Max number of files (1 = single-file; 0 = unlimited). |
| `maxSizeMb` | Number | `0` | Per-file max size in MB (0 = no limit). |
| `lateWarning` | String | `''` | Warning banner text rendered above the form. Empty string hides the banner. |
| `confirmLabel` | String | `'Submit'` | Confirm-button label. |
| `cancelLabel` | String | `'Cancel'` | Cancel-button label. |
| `closeLabel` | String | `'Close'` | Close-button label (result phase). |
| `successText` | String | `'Submitted.'` | Default success banner text. |
| `defaults` | Object | `{}` | Seed values for `reason` / `notes`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `{ reason, notes, files }` | User clicked Submit. `loading` is set; the parent calls `setResult()` to flip into the result phase. |
| `close` | — | Dialog dismissed. |

## Public methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setResult(result)` | `({ success?, message?, error? })` | Flip into the result phase + clear `loading`. |

## File-input semantics

- `maxFiles > 0`: rejects a selection containing more than N files with a typed banner.
- `maxSizeMb > 0`: rejects a selection containing any file larger than the limit, naming the offending file.
- Rejections clear the input and surface as `validationError` text; the form remains in the form phase.

## See also

- [`CnFormDialog`](./cn-form-dialog.md), [`CnWizardDialog`](./cn-wizard-dialog.md), [`CnExportWizard`](./cn-export-wizard.md).
