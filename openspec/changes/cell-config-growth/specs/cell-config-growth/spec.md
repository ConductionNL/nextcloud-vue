# cell-config-growth Delta: cell-config-growth

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [cell-config-growth](../../)

## Purpose

List cells an app drew itself become options of the library cells, so a page declares them in its manifest.

## ADDED Requirements

### Requirement: A number cell reads with its unit and a flag

CnCellRenderer `widget: "number"` SHALL show the value with `widgetProps.unit` (`{ one, other }` with `{count}`,
through the app's translate) and SHALL show the plain number without it. With `widgetProps.flagWhen`
(`{ field, equals | in, text, variant }`) a row where the field holds SHALL show a status chip with the text beside the
number, in the variant's colour; the number then reads in that variant's text colour. An empty value SHALL render an
empty cell, never 0.

#### Scenario: A stuck case

- **GIVEN** a column `{ widget: "number", widgetProps: { unit: { one: "{count} working day", other: "{count} working days" }, flagWhen: { field: "stuck", equals: true, text: "stuck", variant: "warning" } } }`
- **WHEN** the value is 12 and the row's `stuck` is true
- **THEN** the cell reads "12 working days" with a warning chip "stuck"

### Requirement: A withheld value reads as withheld

CnCellRenderer SHALL check for OpenRegister's withheld marker (`{ "@withheld": true }`) before any other path, a
registered cell widget included. It SHALL render a lock icon hidden from assistive technology and the text
"Withheld", with a tooltip that says the reader may not open the linked object when `reason` is `access`, and that the
value is not shown otherwise.

#### Scenario: A lens the reader may not read

- **GIVEN** a cell value `{ "@withheld": true, "reason": "access" }`
- **THEN** the cell reads "Withheld", never "[object Object]", and the tooltip names the access reason

### Requirement: A row indicator can compare a date

A row indicator SHALL take `after` and `before`, each `"now"` or an ISO date. The indicator SHALL apply while the
field holds a readable date after (or before) that moment. A field without a readable date SHALL NOT apply. A row
indicator's text and tooltip SHALL go through the app's translate.

#### Scenario: Held until a later date

- **GIVEN** the indicator `{ id: "held", field: "heldUntil", after: "now", text: "On hold" }`
- **THEN** a row held until next week shows it, and a row held until last week or with no date does not

### Requirement: A badge cell can carry a tooltip

The built-in `badge` SHALL take `widgetProps.titleWhen` (`{ field, equals | in, text }`). When the row field holds,
the badge SHALL carry the translated text as its tooltip; otherwise no tooltip.

#### Scenario: A priority set by hand

- **GIVEN** `titleWhen: { field: "priorityOverride", text: "Priority set by hand" }`
- **THEN** a row with an override carries the tooltip and a row without one does not

### Requirement: A column can show one field and sort on another

A table column SHALL take `valueField`. The cell SHALL render that row field, with that field's schema property, while
the column `key` stays the field the header sorts and filters on.

#### Scenario: A priority sorted by its order

- **GIVEN** the column `{ key: "priorityOrder", valueField: "priority", widget: "badge" }`
- **THEN** the cell shows the priority's label and sorting the column orders by `priorityOrder`

### Requirement: The store's own items read in the user's language

CnStorePage SHALL run the title and the description of each built-in item through the app's translate.

#### Scenario: A Dutch reader without a registry

- **GIVEN** no store registry and a built-in item titled "Objection procedure" that the app translates
- **THEN** the card shows the app's translation

### Requirement: A page can ask for its unread rows

CnIndexPage SHALL take `showUnreadRows`. `true` SHALL mark unread rows (`@self.unread`) in every look and `false`
SHALL never mark them. Unset SHALL keep the look's default.

#### Scenario: A board-look list with an Unread lens chip

- **GIVEN** a board-look index page with `showUnreadRows: true`
- **THEN** an unread row reads in bold with the unread marker
