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

### As the shell of a hand-built dialog

A dialog that would otherwise draw its own success and error note cards, a loading icon on the primary button and a Cancel/Close plus primary footer can let `CnDialog` draw them. Everything here is opt-in: with none of these props set, the dialog renders as before.

```vue
<CnDialog
  :name="t('myapp', 'Lock object')"
  :loading="loading"
  :error="error"
  :success="success"
  :success-text="t('myapp', 'Object locked')"
  show-close
  :primary-label="t('myapp', 'Lock')"
  primary-icon="LockOutline"
  @primary="lock"
  @close="close"
  @closing="close">
  <NcTextField v-model="process" :label="t('myapp', 'Process name')" />
</CnDialog>
```

- `loading` disables both footer buttons, draws a loading icon (with an accessible name) on the primary button and blocks closing.
- `error` draws an error note card in the notice block (under the header, or above the footer with `noticesPlacement: 'bottom'`); the body stays.
- `success` draws a success note card (`successText`, or the string itself when `success` is a string, falling back to "Done."), hides the body unless `keepBodyOnSuccess`, hides the primary button, and the cancel button reads `closeLabel`.
- The `actions` slot still works and draws before the built-in buttons; the `footer` slot replaces the whole footer. The `header` slot replaces the board header (and with it the round close button), or adds content above the body in the Nextcloud look.

Attributes it does not declare (`open`, `data-testid`, listeners such as `update:open`) fall through to `NcDialog`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Dialog title; also the accessible name. |
| `size` | `string` | `'small'` | NcDialog size, used in the Nextcloud look only. |
| `noClose` | `boolean` | `false` | Block closing while an operation runs: the close button is disabled and `closing` is not emitted. |
| `loading` | `boolean` | `false` | An operation is in flight: disables the footer buttons, draws a loading icon on the primary button and blocks closing. |
| `error` | `string` | `''` | Error message drawn in an error note card with the notices (see `noticesPlacement`). |
| `success` | `boolean \| string` | `false` | The operation succeeded: `true` draws `successText`, a string draws itself. Hides the body and the primary button; the cancel button reads `closeLabel`. |
| `successText` | `string` | `''` | Success message when `success` is `true`; empty falls back to "Done.". |
| `keepBodyOnSuccess` | `boolean` | `false` | Keep the body visible after `success`. |
| `showClose` | `boolean` | `false` | Draw the built-in cancel/close footer button, which emits `close`. |
| `cancelLabel` | `string` | `''` | Label of that button before success; empty falls back to "Cancel". |
| `closeLabel` | `string` | `''` | Label of that button after success; empty falls back to "Close". |
| `primaryLabel` | `string` | `''` | Label of the built-in primary footer button, which emits `primary`. Empty draws none. |
| `primaryVariant` | `string` | `'primary'` | Variant of the primary button (`primary`, `secondary`, `tertiary`, `error`, `warning`, `success`). |
| `primaryIcon` | `string` | `''` | A CnIcon name drawn on the primary button when it is not loading. |
| `primaryDisabled` | `boolean` | `false` | Disable the primary button, e.g. while the form is incomplete. |
| `look` | `string` | `undefined` | The look; unset follows the injected `cnLook`. |
| `width` | `string` | `''` | Width role in the board look: `confirm`, `form` or `wizard`. |
| `defaultWidth` | `string` | `'form'` | The width role used when `width` is not set. |
| `eyebrow` | `string` | `''` | Context line above the title (board look). |
| `subtitle` | `string` | `''` | Sentence under the title (board look). |
| `headless` | `boolean` | `false` | Leave out the board header, for a body that draws its own title and close button (CnUserSettingsDialog). `name` stays the accessible name. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `closing` | the NcDialog closing payload | The dialog asks to close (close button, Escape, backdrop). Blocked while `noClose` or `loading` is set. |
| `close` | — | The built-in cancel/close footer button was clicked. |
| `primary` | — | The built-in primary footer button was clicked while enabled. |

## Slots

| Slot | Description |
|------|-------------|
| `default` | The dialog body, below the board header. Hidden after `success` unless `keepBodyOnSuccess`. |
| `header` | Replaces the board header; in the Nextcloud look, content above the body. |
| `actions` | The dialog footer buttons, drawn before the built-in close and primary buttons. |
| `footer` | Replaces the whole footer: the `actions` slot and the built-in buttons. |

## Card notices

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `notices` | Array | `[]` | State banners drawn under the dialog header: each a `notice` content (`{ variant, role?, layout?, title?, text, actions?, dismissible?, visibleWhen? }`, see [CnCardNotices](./cn-card-notices.md)). A notice shows only while its `visibleWhen` holds against the record. |
| `noticesPlacement` | String | `'top'` | Where the notices go: `top` (under the header) or `bottom` (above the footer buttons). |

The `#notice` slot replaces the drawn notices with your own markup. A notice's action button emits `notice-action` (`entry, notice`) and closing a dismissible notice emits `notice-dismiss` (`notice`).
