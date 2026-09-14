# CnStatWidgetForm

Config sub-form for the `stat` ([`CnStatWidget`](./cn-stat-widget.md)) dashboard widget. Drives both `CnAddWidgetModal` and the cog style editor. Collects the OpenRegister data source (register, schema, aggregation, optional value field, filters) plus presentation (label, icon, value colour, caption, number/currency format).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `editingWidget` | `object\|null` | `null` | The placement being edited (pre-fills from `editingWidget.content`), or `null` in create mode. |
| `value` | `object` | defaults | Initial content values when not editing. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:content` | `object` | Emitted with the assembled content blob on every field change. |

## Reading a property off the record

A fifth source kind reads a property off the bound record instead of asking a server for a number. Pick **Field on this record** and name the property. When the property holds a reference, name the register and schema to look the label up in, and optionally a property to colour the tile from, with a value per colour.

The display section edits `display` (plain text, a badge, or a countdown to a date) and `emptyText`, and the special-states list builds `overrides`: a property to test, an optional comparison, and the label, colour and icon to show when it matches. See [`CnStatWidget`](./cn-stat-widget.md) for what each key does at render time.

## Configuring a countdown

Choosing **Countdown to a date** reveals the two day thresholds and the wording for a date that has passed, which is the whole of what most deadline tiles need. Leaving a threshold box empty means no threshold: it is written out of the config rather than saved as zero, because a `dangerAt` of zero paints every tile red on the day its deadline arrives, which is not what clearing a box asks for.

The form draws three of the `countdown` keys and carries the rest. `unit`, `futureLabel`, `todayLabel` and the countdown's own `emptyText` survive a trip through the editor untouched, so a wording an app hand-wrote into its manifest is still there after somebody opens the tile to adjust a threshold. The block also survives switching the tile to plain text and back, so looking at a deadline tile in another mode is not a way to lose its settings.

Keys the form does not show are kept and written back on save, so config an app hand-wrote into its manifest survives a trip through the editor. That holds inside an override too: a clause of the `when` grammar the form does not draw travels through the round trip, and an override it cannot draw at all is re-emitted in its own position rather than dropped.

## Notes

- `validate()` requires `register` + `schema` (and a value `field` for non-count metrics). The record kind requires a property instead, and both halves of a lookup target when one is given.
- Schema properties are self-fetched from OpenRegister when register + schema are set.
- The record kind writes no `source` block, because it issues no request.
