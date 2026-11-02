# CnDialogActions

The footer of a hand-built dialog: a cancel button and a primary button. While the dialog saves, the primary button is disabled and shows a loading icon.

Use it in the `actions` slot of [`CnDialog`](./cn-dialog.md) when the body is too custom for [`CnFormDialog`](./cn-form-dialog.md). The component keeps no state: your dialog owns `saving` and `canSubmit` and does the work on `submit`.

## Import

```js
import { CnDialogActions } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnDialog :name="t('myapp', 'Edit source')" default-width="form" @closing="close">
  <MySourceForm v-model="source" />
  <template #actions>
    <CnDialogActions
      :saving="saving"
      :can-submit="source.title !== ''"
      :confirm-label="editing ? t('myapp', 'Save') : t('myapp', 'Create')"
      @cancel="close"
      @submit="save" />
  </template>
</CnDialog>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `saving` | Boolean | `false` | A save is running. Disables the primary button and draws a loading icon on it. |
| `canSubmit` | Boolean | `true` | The dialog holds enough to submit. `false` disables the primary button. |
| `confirmLabel` | String | `'Save'` | Primary button label. |
| `cancelLabel` | String | `'Cancel'` | Cancel button label. |
| `variant` | String | `'primary'` | Primary button variant: `primary`, `secondary`, `error`, `warning` or `success`. |
| `confirmIcon` | String | `''` | A CnIcon name drawn on the primary button when it is not saving. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `cancel` | | The cancel button was clicked. |
| `submit` | | The primary button was clicked. |

## Accessibility

The loading icon has the accessible name "Loading …", so a screen reader announces that the save is running.
