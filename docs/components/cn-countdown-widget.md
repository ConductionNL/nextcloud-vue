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
| `content` | `Object` | `{}` | `{ field, label, icon, thresholds, showDate }`, plus the term card keys below. `field` is the property holding the target date; `thresholds` is `{ warn, danger }` in days. |
| `objectData` | `Object` | `null` | The bound record, when the surface passes it explicitly. Falls back to the injected `cnObjectContext` a detail page provides. |

## A term card

Four optional keys draw the "Termijn" card of board DqZaak:

- `daysLabel` `{ one, other }` with `{count}` is the headline while days remain ("27 dagen").
- `caption` replaces the date under the headline; `{date}` is the long date and `{count}` the days left ("Beslissen uiterlijk {date}").
- `startField` names the start of the term; a thin bar then shows how much of it has passed.
- `action` puts one manifest action under the card, in the `headerActions` shape. It runs through the page's dispatcher, with `@objectId` and `@object.<field>` resolved.

While the date is unset, `emptyLabel` is the headline ("Niet ingesteld") and `emptyCaption` the line under it, with `{date}` read from `emptyDateField` (board PqTicket: "Verzoeken worden binnen 2 werkdagen beantwoord: {date}."). `facts` (`[{ label, field }]`) adds label and value rows under the caption, leaving out a row without a value. `action.variant: "primary"` draws the button in the primary tint.

In the board look the card draws no icon circle and the headline takes the text colour until a threshold applies.

```json
{
  "field": "deadline",
  "label": "Termijn",
  "daysLabel": { "one": "{count} dag", "other": "{count} dagen" },
  "caption": "Beslissen uiterlijk {date}",
  "startField": "registeredAt",
  "action": { "label": "Termijn opschorten", "type": "handler", "handler": "suspendTerm", "args": ["@objectId"] }
}
```

## The states of a term

Board DqZaakTermijn draws the term card in five states, and `states` gives each its own texts. The state is `overdue` once the date has passed, else `danger` or `warning` by the thresholds, else `extended` when the property `extendedField` names is truthy, else `onTrack`. A settled record and an unset date have no state.

Each state takes an optional `headline`, `caption` and `notice` (`{ lead, text, type }`). The texts fill `{date}` with the long date and `{count}` with the days left, or the days past once the term has passed. The notice draws as a note card under the caption. Without a `type` it is info on track and extended, warning at `warning`, and error at `danger` and `overdue`.

`actions` puts several buttons under the card. A button greys out in the states its `disabledIn` names. `extended` counts whenever the term was extended, so a term extended once cannot be extended again in its last week.

```json
{
  "field": "deadline",
  "label": "Termijn",
  "daysLabel": { "one": "{count} dag", "other": "{count} dagen" },
  "caption": "Beslissen uiterlijk {date}",
  "thresholds": { "warn": 14, "danger": 7 },
  "extendedField": "extendedOn",
  "states": {
    "warning": { "notice": { "lead": "Let op de termijn", "text": "Over twee weken moet het besluit de deur uit." } },
    "danger": { "notice": { "lead": "Urgent: nog een week", "text": "Zonder besluit of verdaging verstrijkt de wettelijke termijn." } },
    "overdue": {
      "headline": "Termijn verlopen",
      "caption": "Beslisdatum was {date}, {count} dagen geleden",
      "notice": { "lead": "De wettelijke termijn is verstreken", "text": "Neem het besluit zo snel mogelijk." }
    },
    "extended": { "notice": { "text": "Verdagen kan één keer." } }
  },
  "actions": [
    { "label": "Verdagen", "type": "open-modal", "modal": "extend-term", "disabledIn": ["overdue", "extended"] },
    { "label": "Termijn opschorten", "type": "handler", "handler": "suspendTerm", "args": ["@objectId"] }
  ]
}
```

The "Termijn verdagen" dialog the board opens from "Verdagen" is a [`CnActionDialog`](./cn-action-dialog.md): the reason, what happens, and the confirm button.

## Notes

- **A past date reads as overdue, never as a negative number.** "-3 days left" is a puzzle, and an overdue case is the one state a handler must not have to decode. It always shows in the error colour, whether or not thresholds are configured.
- **Both ends are floored to midnight** before the days are counted, so "tomorrow" stays 1 day away all day today rather than flipping to 0 at lunchtime.
- **An unset or unparseable date renders a dash and no threshold colour.** A case with no deadline is not urgent and is not on time. It has no deadline, and colouring it green would claim otherwise.
- **The tile is registered for `detail-page` only.** It reads a date off the bound record, which a dashboard does not have.

## See also

- [`CnStatWidget`](./cn-stat-widget.md), whose `objectField` mode is the "read a field off the record" counterpart for non-date values
- [`CnCountdownWidgetForm`](./cn-countdown-widget-form.md) for the config form

<GeneratedRef />
