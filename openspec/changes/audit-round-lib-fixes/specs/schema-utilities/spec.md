# schema-utilities: user pickers and option text

## ADDED Requirements

### Requirement: REQ-SU-AUD-001 A user picker offers the signed-in user

A Nextcloud user picker SHALL list the signed-in user first when their uid or display
name matches the search (an empty search matches), once only. A stored uid of the
signed-in user SHALL show their display name. A mention search SHALL NOT list them.

#### Scenario: Assigning a task to yourself

- **GIVEN** the signed-in user is "Ruben van der Linde"
- **WHEN** they type "linde" in an assignee picker
- **THEN** "Ruben van der Linde" SHALL be the first option

#### Scenario: Picking again after clearing

- **GIVEN** a user field shows "Annemarie de Vries"
- **WHEN** the user clears it and picks her again from an option that carries only a display name
- **THEN** the field SHALL show "Annemarie de Vries", not the uid

### Requirement: REQ-SU-AUD-002 Options wrap between words

A select, multiselect or tag option in `CnFormDialog` SHALL render as one label that
wraps at spaces only.

#### Scenario: A long option in a narrow dropdown

- **GIVEN** an option "Agriculture" in a narrow dropdown
- **WHEN** the dropdown opens
- **THEN** the word SHALL NOT break in the middle
