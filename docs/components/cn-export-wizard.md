---
sidebar_position: 24
---

# CnExportWizard

Configurable export trigger dialog. Composes scope (date range,
regulation, schema), format, and delivery pickers into a single
two-phase modal — form phase → result phase. Emits `@confirm` with
the collected payload; the parent runs the actual export (sync
download OR async background job with status polling) and reports
the outcome back via `setResult({ success, jobId?, message?, error? })`.

Use for compliance / audit / data-portability flows where the shape is
consistent across domains:

- Pick scope (date range, regulation, schema subset)
- Pick format (JSON / XML / PDF / ZIP / bespoke)
- Pick delivery (download, email, API callback)
- Background job + status polling (the consumer handles polling; the
  wizard only renders the result phase + jobId)

Use [`CnFormDialog`](./cn-form-dialog.md) when you need richer form
fields than scope/format/delivery picking, and [`CnMassExportDialog`](./cn-mass-export-dialog.md)
when you just need format-only export of N selected objects.

## Try it

```vue
<template>
  <div>
    <NcButton @click="show = true">Export audit pack</NcButton>

    <CnExportWizard
      v-if="show"
      ref="wizard"
      dialog-title="Export audit pack"
      description="Bundle a compliance audit pack for the selected period."
      :scopes="['date-range', 'regulation']"
      :regulations="['GDPR', 'AVG']"
      :formats="['pdf', 'zip']"
      :deliveries="['download', 'email']"
      @confirm="onExport"
      @close="show = false" />
  </div>
</template>

<script>
import { CnExportWizard } from '@conduction/nextcloud-vue'

export default {
  components: { CnExportWizard },
  data() { return { show: false } },
  methods: {
    async onExport(payload) {
      try {
        const response = await fetch('/api/exports/audit-pack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (data.jobId) {
          this.$refs.wizard.setResult({
            success: true,
            jobId: data.jobId,
            message: 'Export queued. You will receive an email when it finishes.',
          })
          // Polling lives in the consumer — typical flow:
          //   const status = await pollJob(data.jobId)
          //   if (status.complete) downloadFile(status.url)
        } else {
          this.$refs.wizard.setResult({ success: true, message: 'Downloaded.' })
        }
      } catch (e) {
        this.$refs.wizard.setResult({ error: e.message })
      }
    },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dialogTitle` | String | `'Export'` | Dialog header. |
| `description` | String | `''` | Optional intro text above the fields. |
| `scopes` | `Array<'date-range'\|'regulation'\|'schema'>` | `[]` | Which scope pickers render. Unknown values are ignored. |
| `formats` | `Array<string\|{label,value}>` | `[]` | Format select options. Empty hides the field. |
| `deliveries` | `Array<string\|{label,value}>` | `[]` | Delivery select options. `'email'` reveals an email-recipient input. |
| `regulations` | `Array<string\|{label,value}>` | `[]` | Regulation values. When non-empty the regulation field renders as a select; otherwise a free-form text input. |
| `fieldLabels` | Object | `{}` | Override-map keyed by `'dateFrom' \| 'dateTo' \| 'regulation' \| 'schema' \| 'format' \| 'delivery'`. |
| `confirmLabel` | String | `'Export'` | Confirm-button label. |
| `cancelLabel` | String | `'Cancel'` | Cancel-button label (form phase). |
| `closeLabel` | String | `'Close'` | Close-button label (result phase). |
| `successText` | String | `'Export started.'` | Default success-banner text when `result.message` is empty. |
| `jobLabel` | String | `'Job'` | Label preceding the jobId in the success banner. |
| `emailPlaceholder` | String | `'name@example.org'` | Placeholder for the email-recipient input. |
| `defaults` | Object | `{}` | Seed values merged onto the empty form. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `{ dateFrom, dateTo, regulation, schema, format, delivery, emailRecipient }` | User clicked the Export button. The wizard flips into `loading` until `setResult()` is called. |
| `close` | — | User dismissed the dialog. The wizard resets its internal state. |

## Public methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setResult(result)` | `({ success?, jobId?, message?, error? })` | Switch the dialog into the result phase + clear `loading`. |

## Result-phase shape

The result phase renders:

- A green `NcNoteCard` with `result.message` (or `successText`) plus the optional `jobId` when `result.success === true`.
- A red `NcNoteCard` with `result.error` when `result.error` is set.

## Polling pattern

The wizard itself does not poll. Consumers do polling in the
`@confirm` handler and translate the final status into a single
`setResult()` call. Typical shape:

```js
async onExport(payload) {
  const { data: { jobId } } = await axios.post('/api/exports', payload)
  this.$refs.wizard.setResult({ success: true, jobId, message: 'Export queued.' })

  // Poll separately; the dialog stays in the result phase.
  const status = await pollJob(jobId)
  if (status.complete) {
    downloadFile(status.url)
  }
}
```

If the export is synchronous (small dataset, immediate download),
skip the polling entirely:

```js
async onExport(payload) {
  const blob = await downloadExport(payload)
  triggerBlobDownload(blob)
  this.$refs.wizard.setResult({ success: true, message: 'Downloaded.' })
}
```

## See also

- [`CnFormDialog`](./cn-form-dialog.md) — richer schema-driven forms.
- [`CnMassExportDialog`](./cn-mass-export-dialog.md) — format-only export for N selected objects.
