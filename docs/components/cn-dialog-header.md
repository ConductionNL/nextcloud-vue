# CnDialogHeader

The board dialog header: an eyebrow, a 20px title, a subtitle and a round 36px close button. [`CnDialog`](./cn-dialog.md) renders it in the board look, so most dialogs never use it directly. Use it on its own only for a dialog or panel that cannot be built on `CnDialog` but should carry the same header.

The title is presentational (`aria-hidden`): the surrounding dialog's own heading is its accessible name, so a screen reader does not announce the title twice. Give the surrounding dialog that name.

## Import

```js
import { CnDialogHeader } from '@conduction/nextcloud-vue'
```

## Usage

```vue
<CnDialogHeader
  :title="t('myapp', 'New appointment')"
  :eyebrow="t('myapp', 'Agenda')"
  :subtitle="t('myapp', 'Plan a conversation with the client.')"
  :no-close="saving"
  @close="$emit('close')" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `''` | Dialog title. |
| `eyebrow` | `string` | `''` | Context line above the title. |
| `subtitle` | `string` | `''` | Sentence under the title. |
| `noClose` | `boolean` | `false` | Disable the close button (a loading dialog). |
| `closeLabel` | `string` | `'Close'` | Accessible name of the close button. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | none | The close button was pressed. |
