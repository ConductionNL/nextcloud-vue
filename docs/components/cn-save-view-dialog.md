---
title: CnSaveViewDialog
---

# CnSaveViewDialog

Small "Save current view…" dialog (saved-views-ui). Collects a view name and an optional public toggle, then emits `confirm` — the parent persists the view via OpenRegister's views API (`POST /apps/openregister/api/views`) and either closes the dialog or reports the failure back via `setError(message)` on the dialog's ref so the user can retry without losing input.

Used by `CnIndexPage` when `allowSavedViews` is enabled; also usable standalone.

## Try it

```vue
<CnSaveViewDialog
  v-if="showSaveDialog"
  ref="saveViewDialog"
  @confirm="onSaveViewConfirm"
  @close="showSaveDialog = false" />
```

```js
async onSaveViewConfirm({ name, isPublic }) {
  try {
    await createView(buildViewCreatePayload({ name, isPublic, state }))
    this.showSaveDialog = false
  } catch (error) {
    this.$refs.saveViewDialog.setError(error.message)
  }
}
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `dialogTitle` | `String` | `"Save current view"` | Dialog title shown in the NcDialog header. |

## Events

| Event | Payload | Description |
|---|---|---|
| `confirm` | `{ name: string, isPublic: boolean }` | Save clicked with a non-empty (trimmed) name. |
| `close` | — | Dialog dismissed. |

## Methods (via ref)

| Method | Description |
|---|---|
| `setError(message)` | Surface a failed save: clears the loading state and shows the message in an error note card, keeping the user's input. |

## Behaviour

- The Save button is disabled while the name is empty/whitespace or a save is in flight.
- Single-phase by design: success closes the dialog from the parent (no result phase); failure re-enables the form via `setError`.
