# CnMassActionDialog

Two-phase confirmation dialog for one action on many items: publish, lock, validate, restore or delete. The review phase lists the items, and the user can take any item off the list. The result phase shows success or an error.

The dialog does not perform the action. It emits `confirm` with the ids still on the list. Your code performs the call and reports back with `setResult()` on a ref.

[`CnMassDeleteDialog`](./cn-mass-delete-dialog.md) is this dialog with the delete texts, the `error` variant and a trash icon as defaults.

## Import

```js
import { CnMassActionDialog } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnMassActionDialog
  v-if="showPublish"
  ref="publishDialog"
  :items="selectedObjects"
  :dialog-title="t('myapp', 'Publish objects')"
  :warning-text="t('myapp', 'The following objects will be published.')"
  :success-text="t('myapp', 'Objects published.')"
  :confirm-label="t('myapp', 'Publish')"
  confirm-icon="Publish"
  @confirm="onPublishConfirm"
  @close="showPublish = false" />
```

```js
async onPublishConfirm(ids) {
  try {
    await store.massPublish(ids)
    this.$refs.publishDialog.setResult({ success: true })
  } catch (e) {
    this.$refs.publishDialog.setResult({ error: e.message })
  }
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | required | Items the action applies to. Each needs an `id`. |
| `nameField` | String | `'title'` | Field shown as the item name. |
| `nameFormatter` | Function | `null` | `(item) => string` for the item name. Overrides `nameField`. |
| `dialogTitle` | String | `'Confirm action'` | Dialog title. |
| `warningText` | String | `'The action applies to the following items. Remove any items you want to leave out.'` | Text above the item list. |
| `emptyText` | String | `'No items selected.'` | Text when every item is off the list. |
| `successText` | String | `'Done.'` | Text in the result phase on success. |
| `confirmLabel` | String | `'Confirm'` | Primary button label. |
| `cancelLabel` | String | `'Cancel'` | Cancel button label in the review phase. |
| `closeLabel` | String | `'Close'` | Close button label in the result phase. |
| `removeLabel` | String | `'Remove from list'` | Accessible label of the per-item remove button. |
| `variant` | String | `'primary'` | Primary button variant: `primary`, `error`, `warning` or `success`. Use `error` for delete or purge. |
| `confirmIcon` | String or component | `''` | Icon on the primary button: a CnIcon name or an icon component. Empty draws none. |
| `sentence` | String | `'Are you sure you want to continue with {count}?'` | Board look: the question above the list. `{count}` is the bold item count. |
| `irreversible` | Boolean | `false` | Board look: end the sentence with "This action cannot be undone." |
| `confirmValue` | String | `''` | Type-to-confirm: the value the user must type before the primary button works. |
| `confirmFieldLabel` | String | `'Type to confirm'` | Label of the type-to-confirm field. |
| `look` / `width` / `eyebrow` / `subtitle` | String | | Board look props, as on [`CnDialog`](./cn-dialog.md). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `ids[]` | The user confirmed. The payload holds the ids still on the list. |
| `close` | | The dialog should close: cancel, close button, or 2 seconds after a success. |

## Public methods

| Method | Description |
|--------|-------------|
| `setResult({ success?, error? })` | Report the outcome. A success closes the dialog after 2 seconds; an error stays open. |

## Test ids

The dialog carries `data-testid-modal="cn-mass-action-dialog"`, and the primary button `data-testid="cn-mass-action-dialog-confirm"`. `CnMassDeleteDialog` keeps its own `cn-mass-delete-*` test ids.
