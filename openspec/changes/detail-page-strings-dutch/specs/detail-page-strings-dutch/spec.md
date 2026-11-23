## ADDED Requirements

### Requirement: The detail page speaks the reader's language

A detail page SHALL run every manifest-authored in-body section title through the host's translate function. Its skip link SHALL be one translatable library string with the action as a placeholder.

#### Scenario: A section title on a Dutch ticket
- **GIVEN** a body section titled "Asked about" and a host catalogue that translates it as "Vraag over"
- **WHEN** a Dutch reader opens the record
- **THEN** the section heading SHALL read "Vraag over"

#### Scenario: The skip link on a Dutch ticket
- **GIVEN** a primary action labelled "In behandeling nemen"
- **WHEN** a Dutch reader tabs to the skip link
- **THEN** it SHALL read "Ga naar In behandeling nemen"

@e2e exclude Covered by unit tests on CnBodySections and the real @nextcloud/l10n; the hosts' manifests carry the strings.
