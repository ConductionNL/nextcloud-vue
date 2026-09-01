import GeneratedRef from './_generated/CnCountdownWidget.md'

# CnCountdownWidget

A KPI tile for how long is left until a date on the bound record.

## Why it exists

Every other tile in the catalog answers "how many", by aggregating in OpenRegister or calling an endpoint. This one answers "how long", and it needs neither. The detail page has already loaded the record, so the tile reads the date straight off it and does the arithmetic. No request, and nothing to go stale.

It headlines the remaining time and carries the date itself underneath, because "12 days left" and "5 October" answer different questions and a case handler asks both.

## Usage

```json
{
  "id": "case-kpi-time-left",
  "type": "countdown",
  "title": "Time left",
  "content": {
    "label": "Time left",
    "field": "deadline",
    "icon": "ClockAlertOutline",
    "thresholds": { "warn": 14, "danger": 5 }
  }
}
```

`thresholds` are in days remaining, and recolour the tile as the date approaches. Leave them out to keep the tile one colour.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `Object` | `{}` | `{ field, label, icon, thresholds, showDate }`. `field` is the property holding the target date; `thresholds` is `{ warn, danger }` in days. |
| `objectData` | `Object` | `null` | The bound record, when the surface passes it explicitly. Falls back to the injected `cnObjectContext` a detail page provides. |

## Notes

- **A past date reads as overdue, never as a negative number.** "-3 days left" is a puzzle, and an overdue case is the one state a handler must not have to decode. It always shows in the error colour, whether or not thresholds are configured.
- **Both ends are floored to midnight** before the days are counted, so "tomorrow" stays 1 day away all day today rather than flipping to 0 at lunchtime.
- **An unset or unparseable date renders a dash and no threshold colour.** A case with no deadline is not urgent and is not on time. It has no deadline, and colouring it green would claim otherwise.
- **The tile is registered for `detail-page` only.** It reads a date off the bound record, which a dashboard does not have.

## See also

- [`CnStatWidget`](./cn-stat-widget.md), whose `objectField` mode is the "read a field off the record" counterpart for non-date values
- [`CnCountdownWidgetForm`](./cn-countdown-widget-form.md) for the config form

<GeneratedRef />
