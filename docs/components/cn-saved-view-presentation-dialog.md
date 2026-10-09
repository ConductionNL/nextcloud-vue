# CnSavedViewPresentationDialog

A small dialog to change how a saved view shows (table, board or calendar). `CnIndexPage` opens it from the Presentation entry of a view the user may edit (`@self.access` `owner` or `write`) in [`CnSavedViewsControl`](./cn-saved-views-control.md) and saves with a `PATCH` of `presentation` only, so a writer never sends `sharedWith` or `owner`. It holds [`CnViewPresentationPicker`](./cn-view-presentation-picker.md) seeded from the view. A reader (`read`) is not offered it.

Two-phase: `confirm` carries the presentation; the parent saves, then closes the dialog, or calls `setError(message)` on its ref. A message naming `kanban.groupByField`, `calendar.dateField` or `calendar.endDateField` is shown under that picker and the form stays open; any other message goes at the top. Save stays disabled while a board has no group field or a calendar no date field.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `view` | Object | `{}` | The view being edited (its `presentation` seeds the picker). |
| `schema` | Object | `null` | The view's JSON Schema, which decides what each picker offers. |
| `dialogTitle` | String | `'How this view shows'` | Dialog title. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `object` | Save clicked. The presentation in OpenRegister's shape. |
| `close` | — | Dialog dismissed. |
