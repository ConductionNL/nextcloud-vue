# CnChartWidgetForm

Config sub-form for the `chart` ([`CnChartWidget`](./cn-chart-widget.md)) dashboard widget. Drives both `CnAddWidgetModal` and the cog `CnWidgetStyleEditorModal`. Collects the chart kind (area/bar/line/…), the breakdown (over time vs by category), the OpenRegister data source, the breakdown field (a date field for time series), the interval, and the aggregation.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode. |
| `value` | `object` | defaults | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | Emitted with the assembled `{ chartKind, dataSource }` blob on every field change. |

## Notes

- `validate()` requires `register` + `schema` + the relevant breakdown field, plus a value field for non-count metrics.
- For "over time" charts the breakdown field must be a date property; `interval` buckets the series (day/week/month/…).
