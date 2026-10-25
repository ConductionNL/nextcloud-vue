# audit-trail Delta

## ADDED Requirements

### Requirement: An audit row can put its moment under the action

An audit trail widget with `layout: "stacked"` SHALL show each entry's moment and actor as one line under the action,
and every layout SHALL name a person actor by display name.

#### Scenario: DqTaak Historie

- **GIVEN** pieter (Pieter Jansen) picked the task up on 6 October at 09:05
- **THEN** the row reads "Taak opgepakt door Pieter Jansen" with "6 okt 09:05" under it
