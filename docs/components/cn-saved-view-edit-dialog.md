# CnSavedViewEditDialog

Rename an own saved view and, when asked, replace its criteria with the filters, search and sort the list shows now. Opened by [`CnIndexPage`](./cn-index-page.md) from the Edit entry of [`CnSavedViewsControl`](./cn-saved-views-control.md).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `view` | `Object` | `{}` | The view being edited; its `name` fills the field. |
| `dialogTitle` | `String` | `''` | Dialog title; empty reads "Edit view: {name}". |
| `savedSummary` | `String` | `''` | What the view holds now, shown under "Keep what is saved" in the board look. |
| `currentSummary` | `String` | `''` | What the list shows now, shown under "Replace with …" in the board look. |

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `{ name, replaceCriteria }` | Save clicked with a non-empty name. |
| `close` | none | Dialog dismissed. |

Call `setError(message)` on the ref after a refused save: the form stays open with the message.

The dialog renders through `CnDialog`: under the board look it is the board dialog (board header, round close button) and takes the shared dialog props `look`, `width`, `eyebrow` and `subtitle`.
