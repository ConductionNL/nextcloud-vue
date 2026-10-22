# field-list

## ADDED Requirements

### Requirement: A field list entry can be edited, and one entry can be the primary

With `edit`, each row SHALL offer an Edit button named after the row that opens the form prefilled with the entry; saving SHALL replace that entry with one PATCH of the field. A `checkbox` field SHALL store `true` or `false`. A flag in `add.exclusive` that an added or edited entry holds SHALL be cleared on every other entry in the same save. `row.href: { path, scheme }` SHALL link the title to `mailto:` or `tel:` with the value.

#### Scenario: Make the second email the primary
- **GIVEN** two emails, the first primary
- **WHEN** the user edits the second and ticks Primary
- **THEN** one PATCH saves the second as primary and the first as not
