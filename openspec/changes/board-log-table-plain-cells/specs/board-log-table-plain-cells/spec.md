## ADDED Requirements

### Requirement: a table's title column can read as plain text

CnDataTable MUST accept `rowTitle: "text"`. In the board look such a table's title column MUST take the ordinary cell's weight (400), size and colour, without an underline, and the row MUST stay a link. CnObjectListWidget MUST pass its `content.rowTitle` to the table. The Nextcloud look ignores it.

#### Scenario: DqZaakContact contact moments
- GIVEN the case's contact-moments card with `rowTitle: "text"` in the board look
- THEN the date column reads as regular text, not an underlined bold link

### Requirement: a date cell can write the board's short date with its time

The `date` cell widget with `widgetProps.short: true` MUST write the short date ("5 okt", the year added outside the current year); with `showTime: true` it MUST add the time after a comma ("5 okt, 09:15").

#### Scenario: contact moment date
- GIVEN a contact moment at 5 October 09:15 this year, `widgetProps: { short: true, showTime: true }`
- THEN the cell reads "5 okt, 09:15"

### Requirement: an icon-label cell can pick its icon by value

The `iconLabel` cell widget MUST accept `widgetProps.icons`, a map from the stored value to an icon name; the value's icon is drawn before its label, and a value without an entry falls back to `widgetProps.icon`.

#### Scenario: channel column
- GIVEN `icons: { "email": "EmailOutline" }` and the value "email" labelled "E-mail"
- THEN the cell draws the EmailOutline icon before "E-mail"
