# cell-date-age Delta: screens-cell-date-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-cell-date-parity](../../)

## Purpose

What one table cell says about a date or a reference, as the boards draw it.

## ADDED Requirements

### Requirement: An age cell says how long something has waited

`CnCellRenderer` SHALL render the built-in `widget: "age"` as a `<time>`
element whose `datetime` is the cell's moment and whose title is the full date
and time. Its text SHALL be the whole hours since the moment when less than 24
hours have passed (at least 1, and 0 for a moment in the future), and the
whole calendar days otherwise (at least 1), in the user's language through the
library's plural catalogue. An empty or unparseable value SHALL render the
dash.

#### Scenario: Four hours

- **GIVEN** an age column and a row whose moment is four hours ago, for a Dutch reader
- **WHEN** the cell renders
- **THEN** it reads "4 uur"

#### Scenario: Three days

- **GIVEN** a moment three calendar days ago
- **WHEN** the cell renders
- **THEN** it reads "3 dagen" (en "3 days")

### Requirement: An age cell turns red past its threshold

The age widget SHALL colour its text by `widgetProps.variantWhen`, rules
`{ op, value, variant }` evaluated in order against the number of days the
cell shows (0 under a day); the first match wins, `danger` is read as
`error`, and an unknown variant matches nothing. A matched cell SHALL be set
in weight 600. Under the board look every age cell SHALL be weight 600.

#### Scenario: Late

- **GIVEN** `variantWhen: [{ op: "gte", value: 3, variant: "error" }]` and a moment four days ago
- **WHEN** the cell renders
- **THEN** it carries `cn-cell-renderer__age--error`

#### Scenario: Not late

- **GIVEN** the same rule and a moment five hours ago
- **WHEN** the cell renders
- **THEN** it carries no variant class

### Requirement: A board date cell reads day and short month in the user language

Under the board look a cell whose property has `format: "date"` or
`"date-time"`, and the `date` widget without `showTime` or `timeOnly`, SHALL
render the date as day and short month ("5 okt"), adding the year only when
the date is outside the current year ("14 feb 2024"), with the full date as
the tooltip. The words SHALL follow the Nextcloud user language; the user
locale SHALL be used only when it is a region of that language. Without the
board look these cells SHALL render as before.

#### Scenario: A Dutch reader on the default locale

- **GIVEN** the board look, user language `nl`, user locale `en_US`, and a deadline of 5 October this year
- **WHEN** the cell renders
- **THEN** it reads "5 okt"

#### Scenario: Another year

- **GIVEN** the board look and the date 14 February 2024
- **WHEN** the cell renders
- **THEN** it reads "14 feb 2024"

#### Scenario: Without the look

- **GIVEN** no board look and a `format: "date"` property
- **WHEN** the cell renders
- **THEN** it renders the relative `NcDateTime` as before

### Requirement: A reference column shows the referenced name from one batched request

A CnIndexPage column with `labelField` on a property that references another
schema by slug (`$ref`) SHALL show the referenced object's label, resolved for
all rows of the page in one request per referenced schema in the page's
register when the property names none (existing `index-ref-column-labels`
behaviour, recorded here for the PqTickets Klant column).

#### Scenario: The Klant column

- **GIVEN** a ticket page in register `pipelinq` with the column `{ key: "client", labelField: "name" }` over `client: { format: "uuid", $ref: "client" }` and three rows referencing two clients
- **WHEN** the labels load
- **THEN** one request asks for both ids and the cells show the clients' names
