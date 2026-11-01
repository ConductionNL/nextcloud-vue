# badge-cell-list Delta: badge-list-labels-and-tags

## ADDED Requirements

### Requirement: A badge list chip shows its entry's label

A `badge` cell whose value is a list SHALL show each entry by its label from the items' `x-enum-labels` (or the
normalised `enumLabels`), through the host translate, and an entry without a label as stored.

#### Scenario: Board PqServices

- **GIVEN** a service with `requiredResourceTypes: ["staff", "equipment"]` whose items label staff "Staff"
- **THEN** the cell shows the chips "Staff" and "Equipment", translated ("Medewerkers", "Apparatuur")

### Requirement: A badge list draws the board's small tags

In the board look the chips of a `badge` list in a table SHALL be 2px 8px with a 10px radius, 12px at 600 on a normal
line, 4px apart.

#### Scenario: Board PqServices

- **WHEN** the services list shows a service booked on staff and equipment
- **THEN** each tag is 18px tall with 12px text
