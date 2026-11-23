# next-step-title-tokens Delta

## ADDED Requirements

### Requirement: A what-now title can name record fields

A `nextStep` stage's `title` and `after` SHALL take `{path}` tokens filled from the record after translation, and MAY be
a list of candidates of which the first whose fields all have a value is shown. `{path|lower}` SHALL write the value in
lower case.

#### Scenario: DqZaak

- **GIVEN** a case in progress whose public status label is "In behandeling", with the title `["What now? Step 2: {statusPublicLabel|lower}", "What now? Handle the case"]`
- **THEN** the card reads "Wat nu? Stap 2: in behandeling" in Dutch

#### Scenario: No label

- **GIVEN** the same case without a public status label
- **THEN** the card reads the second candidate
