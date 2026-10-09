# CnSavedViewWidget

A dashboard widget driven by a saved view. Registered under the `saved-view` type and configured by [`CnSavedViewWidgetForm`](./cn-saved-view-widget-form.md). Rows are drawn by [`CnObjectListWidget`](./cn-object-list-widget.md).

## Content shape

```json
{ "viewId": "42", "limit": 10 }
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The widget config: `viewId` and `limit` (default 10). |
| `api` | `object\|null` | `null` | Injected views API (`{ fetchViews }`) for tests; defaults to `useSavedViewsApi`. |

## Notes

- Nothing of the view is copied into the layout: the view is read on every load.
- A view that is missing, or answers 403 or 404, renders a named refusal. An empty result renders the normal empty state.
- Marked `userAddable`, so `listUserAddableWidgetTypes()` offers it.
