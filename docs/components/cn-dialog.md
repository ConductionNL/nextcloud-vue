# CnDialog

The dialog frame every `Cn*` dialog uses, exported so an app dialog looks the same. In the Nextcloud look it is `NcDialog` with the caller's `size`, unchanged. In the board look it renders the board dialog: the width from a width role, the board header (eyebrow, title, subtitle and a round close button, see [`CnDialogHeader`](./cn-dialog-header.md)) above the body, and the footer buttons from the `actions` slot.

The NcDialog heading stays in the DOM, visually hidden in the board look, so the dialog keeps `name` as its accessible name.

## Import

```js
import { CnDialog } from '@conduction/nextcloud-vue'
```

## Usage

Keep the dialog in its own file under `src/dialogs/` (the modal-isolation rule) and wrap its body in `CnDialog`:

```vue
<CnDialog
  :name="t('myapp', 'New appointment')"
  :eyebrow="t('myapp', 'Agenda')"
  :subtitle="t('myapp', 'Plan a conversation with the client.')"
  width="form"
  @closing="$emit('close')">
  <p>…the form…</p>
  <template #actions>
    <NcButton @click="$emit('close')">{{ t('myapp', 'Cancel') }}</NcButton>
    <NcButton variant="primary" @click="save">{{ t('myapp', 'Save') }}</NcButton>
  </template>
</CnDialog>
```

Attributes it does not declare (`open`, `data-testid`, listeners such as `update:open`) fall through to `NcDialog`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Dialog title; also the accessible name. |
| `size` | `string` | `'small'` | NcDialog size, used in the Nextcloud look only. |
| `noClose` | `boolean` | `false` | Block closing while an operation runs: the close button is disabled and `closing` is not emitted. |
| `look` | `string` | `undefined` | The look; unset follows the injected `cnLook`. |
| `width` | `string` | `''` | Width role in the board look: `confirm`, `form` or `wizard`. |
| `defaultWidth` | `string` | `'form'` | The width role used when `width` is not set. |
| `eyebrow` | `string` | `''` | Context line above the title (board look). |
| `subtitle` | `string` | `''` | Sentence under the title (board look). |
| `headless` | `boolean` | `false` | Leave out the board header, for a body that draws its own title and close button (CnUserSettingsDialog). `name` stays the accessible name. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `closing` | the NcDialog closing payload | The dialog asks to close (close button, Escape, backdrop). |

## Slots

| Slot | Description |
|------|-------------|
| `default` | The dialog body, below the board header. |
| `actions` | The dialog footer buttons. |
