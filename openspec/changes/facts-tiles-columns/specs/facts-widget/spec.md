# facts-widget: delta for facts-tiles-columns

## ADDED Requirements

### Requirement: Tiles can sit in columns and a tile can span the row

With `layout: "tiles"`, a facts widget MUST set its tiles in `columns` equal columns when `columns` is 2 or more, and a field with `wide: true` MUST span the whole row. Without `columns` the tiles MUST wrap as before.

#### Scenario: a journey's steps

- GIVEN a facts widget with `layout: "tiles"`, `columns: 3` and the fields Trigger, Wait, Condition and Action, Action `wide`
- WHEN it renders
- THEN Trigger, Wait and Condition sit side by side in one row
- AND Action takes the whole next row
