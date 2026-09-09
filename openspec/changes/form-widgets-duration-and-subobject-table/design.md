# Design: duration and sub-object table widgets

## Components

- `src/components/CnFormDialog/widgets/CnDurationField.vue`
- `src/components/CnFormDialog/widgets/CnSubObjectsField.vue`
- Widget resolver in `CnFormDialog` and `CnFormPage` (shared
  `resolveFieldWidget`).

Kind: code.

## Widget mapping

| schema | widget | override |
|---|---|---|
| `type: string, format: duration` | `duration` | `fieldOverrides.<key>.widget` |
| `type: array, items: { type: object }` | `json` (unchanged) | `x-widget: sub-objects` on the property, or the field override |

## Duration widget

- Model value: ISO 8601 duration string (`P56D`, `PT4H`, `P1M`).
- Renders a number input and a unit select (minutes, hours, days, weeks,
  months, years) with `inputLabel`. Reads the largest whole unit from the
  stored value; `P1W` shows 1 week, `P10D` shows 10 days, `PT90M` shows 90
  minutes.
- Writes the canonical string for the chosen unit. Mixed values (`P1DT2H`)
  render as a read-only text with an "Edit as ISO" toggle, so nothing is
  silently rounded.
- Empty input writes `null`.
- Validation: the schema's `minimum` and `maximum`, when present as ISO
  strings, compare in seconds.

## Sub-objects widget

- Model value: array of objects; columns come from `items.properties`.
- Renders a `CnDataTable` with one column per property up to `maxColumns`
  (default 6, the rest editable in the row dialog), an "Add row" button, a
  row menu with Edit, Duplicate, Move up, Move down, Remove.
- Edit opens a nested `CnFormDialog` over `items` (the two-phase pattern,
  REQ-DG-001) so every existing widget works inside a row, including
  `duration`.
- Reorder writes the array in the new order. A property named `order` in
  `items.properties` is rewritten to match.
- `items.required` is validated per row; a row missing a required value
  blocks Save with the row number in the message.
- Keyboard: the table is navigable per REQ-DG-015; Move up and Move down are
  buttons, not drag only.

## What this does not do

It does not replace an object-list over a related schema. When rows are
their own objects (`statusType` rows keyed to a case type), the object-list
with `object-list-create-with-initial-data` is the right tool. This widget is
for arrays embedded in one object.

## Alternatives considered

- A generic "repeater" over any array: `tags` and `multiselect` already cover
  scalar arrays; the object case is what is missing.
- Editing durations as seconds: rejected, no admin thinks in 4,838,400.
