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

```js static
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
| `confirm` | `{ name: string, isPublic: boolean, sharedWith: Array<{ group, mode }>, presentation?: object }` | Save clicked with a non-empty (trimmed) name. `sharedWith` is `[]` when no group is picked, so a consumer that reads only `name` and `isPublic` keeps working. |
| `close` | — | Dialog dismissed. |

## Methods (via ref)

| Method | Description |
|---|---|
| `setError(message)` | Surface a failed save: clears the loading state and shows the message in an error note card, keeping the user's input. |

## Behaviour

- The Save button is disabled while the name is empty/whitespace or a save is in flight.
- Single-phase by design: success closes the dialog from the parent (no result phase); failure re-enables the form via `setError`.

## Sharing with groups

Under the public switch the dialog shows [`CnSavedViewShareFields`](./cn-saved-view-share-fields.md): a group picker over Nextcloud's sharee API and a "May edit" switch per group. The section is absent when the sharee API answers no groups for the user. Pass `sharedWith` on to `buildViewCreatePayload({ ..., sharedWith })`, which writes `sharedWith: [{ group, mode }]` into the body and omits it when empty. A refused save (403 and the like) goes back through `setError(message)`: the form stays open and shows the server's message.

## Presentation (`schema`)

`schema` (Object, default `null`): the view's JSON Schema. With it the dialog shows [`CnViewPresentationPicker`](./cn-view-presentation-picker.md) under the public switch and `confirm` carries `presentation` (OpenRegister's shape); Save is disabled while a board has no group field or a calendar no date field. Without it the dialog renders and emits as before, with no `presentation` key. `CnIndexPage` passes its schema once it has properties and sends `presentation` in the view body only for a board or a calendar (a table is the default). A refusal naming `kanban.groupByField`, `calendar.dateField` or `calendar.endDateField` goes under that picker via `setError(message)`.
