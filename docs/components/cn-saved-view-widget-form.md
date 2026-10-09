# CnSavedViewWidgetForm

Config sub-form for the `saved-view` ([`CnSavedViewWidget`](./cn-saved-view-widget.md)) widget. Lists the reader's own and public views and stores a view id plus a row limit.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited, or `null` in create mode. |
| `value` | `object` | `{}` | Initial content values when not editing. |
| `api` | `object\|null` | `null` | Injected views API (`{ fetchViews }`) for tests; defaults to `useSavedViewsApi`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | Emitted with `{ viewId, limit }` on every change. |

## Notes

- A reader with no views sees an empty state, not a blank select.
- `validate()` requires a chosen view.
