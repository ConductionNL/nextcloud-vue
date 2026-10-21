## ADDED Requirements

### Requirement: A list publishes its rows and its selected row

An `object-list` widget with `content.rowSelection: true` on a detail page
SHALL publish the rows it shows and the row the reader clicked, under its
widget id, and SHALL mark the selected row. A selection whose row is no longer
listed SHALL be dropped.

#### Scenario: The reader selects a field
- **GIVEN** a Velden table with row selection
- **WHEN** the reader clicks "Soort bouwwerk"
- **THEN** the page's selection for that table SHALL be that row

### Requirement: A card follows the selected row

A side-column widget with `follows: { widget, register, schema, when? }` SHALL
be hosted on the followed row:

- its record, id, register and schema SHALL be the row's;
- `{field}` placeholders in its title SHALL be filled from the row;
- it SHALL show the selected row when `when` holds for it, else, while nothing
  is selected, the first row for which `when` holds;
- it SHALL draw nothing when there is no such row.

#### Scenario: The choice list of the selected field
- **GIVEN** the Velden table lists Bouwkosten and Soort bouwwerk, and only Soort bouwwerk has options
- **WHEN** the page opens
- **THEN** the side card SHALL read "Keuzelijst: Soort bouwwerk" and list its options

### Requirement: A field list adds plain values

A `field-list` with `add.scalar: true` SHALL add the trimmed value of its first
add field itself to the list, not an object.

#### Scenario: An option is added
- **GIVEN** the choice list card on Soort bouwwerk
- **WHEN** the reader adds "Schuur"
- **THEN** `enumValues` SHALL end with the string "Schuur"
