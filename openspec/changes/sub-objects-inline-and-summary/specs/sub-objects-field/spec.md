# sub-objects-field Delta: sub-objects-inline-and-summary

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: Short rows are edited in the row

With `inline: true` CnSubObjectsField SHALL draw each column of a row as a control that fits its property (a select for an
enum, a switch for a boolean, a number field, a time or date field, else a text field), named after the column and the row,
and SHALL add a row in place, focusing its first cell, without a row dialog.

#### Scenario: Working hours

- **GIVEN** working hours with a day, an opening and a closing time
- **WHEN** the administrator adds a row
- **THEN** a new row appears with a day select and two time fields, and the day select has focus

### Requirement: A summary adds up the rows

`summary` SHALL show under the table with `{count}`, `{sum:<path>}` and `{@object.<path>}` filled in, while there are rows.

#### Scenario: Steps against the service duration

- **GIVEN** steps of 20 and 25 minutes on a 60 minute service and the summary "{sum:durationMinutes} of {@object.durationMinutes} min"
- **THEN** the line reads "45 of 60 min"

### Requirement: A row rule names the row that breaks it

A `rowRules` entry `{ when, message }` SHALL mark a row wrong while `when` holds for it, with `@row.<field>` naming another
field of the row. The first problem SHALL show under the table as "<row>: <message>", and CnFormDialog SHALL block the save
with "Row <n>: <message>". Two clock times SHALL compare as times of the day.

#### Scenario: Closing before opening

- **GIVEN** a second row that opens at 18:00 and closes at 12:00
- **WHEN** the administrator saves
- **THEN** the save is blocked with "Row 2: Open time must be before close time."
