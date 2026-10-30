# dashboard-header-pills Delta

## ADDED Requirements

### Requirement: A dashboard can open its description line with pills

A dashboard MAY declare `headerPills`, a list of `{ label, variant?, when? }`. The dashboard SHALL draw each pill with a
label whose `when` workspace condition holds, or that has no `when`, as a status badge with its translated label at the
start of the line under the title, in the declared order. A pill without a label SHALL NOT be drawn.

#### Scenario: Board PqWerkplekKlant in a call

- **WHEN** the page declares "Phone, incoming" for `callActive` and "Identified" for `callIdentified`, and both hold
- **THEN** the line under the title opens with "Telefoon, inkomend" and "Geïdentificeerd"
- **AND** when the call ends neither pill is drawn
