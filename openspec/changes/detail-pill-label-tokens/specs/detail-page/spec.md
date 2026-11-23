# detail-page Delta

## ADDED Requirements

### Requirement: A header pill label can name the record's fields

A header pill's label SHALL have its `{field}` tokens filled from the record after translation. A token whose field
is empty SHALL be left out of the label.

#### Scenario: A published case type version

- **GIVEN** `statusPill: { field: "isDraft", labels: { "false": "Version {version} published" } }` and version 4
- **THEN** the pill reads "Versie 4 gepubliceerd" in Dutch
