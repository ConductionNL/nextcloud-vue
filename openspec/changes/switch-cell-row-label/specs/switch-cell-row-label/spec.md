# switch-cell-row-label Delta

## ADDED Requirements

### Requirement: A switch cell can be named per row without showing the name

A `switch` cell with `widgetProps.ariaLabel` (a string, or a function of the row returning one) SHALL show no value and
SHALL carry that text as the switch's label for assistive technology only. Without it the cell SHALL show the value as
before.

#### Scenario: Board PqBiExport

- **GIVEN** the Ingeschakeld column with `ariaLabel: (row) => "Run " + row.name + " on its schedule"`
- **THEN** each row draws a bare switch
- **AND** a screen reader names it "Run Tickets voor het KCC-dashboard on its schedule"
