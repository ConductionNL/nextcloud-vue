# CnConfirmDialog

Generic, verb-agnostic confirmation dialog (NcDialog-based) with the
two-phase **confirm → result** pattern. Unlike
[`CnDeleteDialog`](./cn-delete-dialog.md) it carries no delete-specific
copy or store coupling — the dialog performs **no operation itself**: it
emits `confirm`, the parent does the work, then reports the outcome back
via `setResult()` on a ref.

Used by [`CnWidgetObjectTable`](./cn-widget-object-table.md) to
confirm-gate declarative `object-op` actions (`delete` always;
`patch` / `create` on `confirm: true`), and reusable for any
confirm→do→report flow. Lives in its own file under `src/dialogs/` per
the modal-isolation rule.

## Import

```js
import { CnConfirmDialog } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnConfirmDialog
  v-if="showConfirm"
  ref="confirmDialog"
  :dialog-title="t('myapp', 'Accept request')"
  :message="t('myapp', 'Accept this request?')"
  @confirm="onConfirm"
  @close="showConfirm = false" />
```

```js
// In methods:
async onConfirm() {
  const ok = await doTheThing()
  this.$refs.confirmDialog.setResult(ok ? { success: true } : { error: 'It failed' })
}
```

For a destructive operation pass `variant="error"` — the primary button
renders in the error style and the confirm-phase note card renders as a
warning:

```vue
<CnConfirmDialog
  variant="error"
  :dialog-title="t('myapp', 'Delete item')"
  :message="t('myapp', 'This cannot be undone.')"
  :confirm-label="t('myapp', 'Delete')"
  @confirm="onDeleteConfirm"
  @close="..." />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dialogTitle` | `string` | `'Confirm action'` | Dialog header title. |
| `message` | `string` | `'Are you sure you want to continue?'` | Confirmation question shown in the confirm phase. |
| `variant` | `'primary'\|'error'\|'warning'\|'success'` | `'primary'` | Primary-button variant; `error` marks the confirm as destructive. |
| `confirmLabel` | `string` | `'Confirm'` | Primary button label. |
| `cancelLabel` | `string` | `'Cancel'` | Cancel button label (confirm phase). |
| `closeLabel` | `string` | `'Close'` | Close button label (result phase). |
| `successText` | `string` | `'Done.'` | Success message in the result phase. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | — | The user confirmed; the parent performs the operation and calls `setResult()`. |
| `close` | — | The dialog should close (cancel, close button, or auto-close 2s after a success result). |

## Public methods

| Method | Description |
|--------|-------------|
| `setResult({ success?, error? })` | Report the operation outcome — flips the dialog into its result phase (success auto-closes after 2s; an error stays open). |
