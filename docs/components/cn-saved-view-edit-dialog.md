# CnSavedViewEditDialog

Rename an own saved filter and, when asked, replace its criteria with the filters, search and sort the list shows now. Opened by [`CnIndexPage`](./cn-index-page.md) from the Edit entry of [`CnSavedViewsControl`](./cn-saved-views-control.md).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `view` | `Object` | `{}` | The view being edited; its `name` fills the field. |
| `dialogTitle` | `String` | `''` | Dialog title; empty reads "Edit filter: {name}". |

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `{ name, replaceCriteria }` | Save clicked with a non-empty name. |
| `close` | none | Dialog dismissed. |

Call `setError(message)` on the ref after a refused save: the form stays open with the message.
