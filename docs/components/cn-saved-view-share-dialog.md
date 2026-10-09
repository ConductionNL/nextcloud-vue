# CnSavedViewShareDialog

A small dialog to change who a saved view is shared with. `CnIndexPage` opens it from the Share entry of an own view in [`CnSavedViewsControl`](./cn-saved-views-control.md) and saves the answer with a `PATCH` of `sharedWith` only. It holds [`CnSavedViewShareFields`](./cn-saved-view-share-fields.md) seeded from the view.

Two-phase like the other save dialogs: `confirm` carries the audience; the parent saves, then closes the dialog, or calls `setError(message)` on its ref, which keeps the form open and shows the server's message.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `view` | Object | `{}` | The view being shared (its `sharedWith` seeds the fields). |
| `dialogTitle` | String | `'Share view'` | Dialog title. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `Array<{ group, mode }>` | Save clicked. `[]` stops sharing. |
| `close` | — | Dialog dismissed. |
