# CnAppTilesWidgetForm

Config sub-form for the `app-tiles` widget: the title, the apps pinned first, and whether the filter field and the "Most used" row show. Every field is optional, so the form is always valid. Keys it does not edit (`apps`, `exclude`, `status`, `mostUsedLimit`) are kept.

Part of the dashboard widget library. See [CnAppTilesWidget](./cn-app-tiles-widget.md).

## Reference

### Props

| Name | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `editingWidget` | `{content: object}` or `null` | | `null` | The placement being edited, or `null` in create mode. |
| `value` | `object` | | `\{\}` | Initial content values when not editing. |

### Events

| Name | Payload | Description |
| --- | --- | --- |
| `update:content` | `object` | The assembled content blob, on every field change. |
