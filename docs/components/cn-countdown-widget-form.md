import GeneratedRef from './_generated/CnCountdownWidgetForm.md'

# CnCountdownWidgetForm

The config sub-form for a [`countdown`](./cn-countdown-widget.md) widget. Used by `CnAddWidgetModal` and the cog editor.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `Object` | `{}` | The stored config: `{ field, label, icon, thresholds, showDate }`. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `update:content` | `object` | The edited config blob. |

## Notes

- **An empty threshold input removes the band rather than storing `0`.** A stored zero would colour every future date as urgent, which is the opposite of leaving the field blank.

## See also

- [`CnCountdownWidget`](./cn-countdown-widget.md) for the widget this configures

<GeneratedRef />
