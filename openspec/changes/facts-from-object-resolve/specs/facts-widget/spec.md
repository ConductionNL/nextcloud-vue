# facts-widget Delta

## ADDED Requirements

### Requirement: A from-object entry resolves its reference from the page object

A facts entry with `from: "object"` and `resolve` SHALL show the label of the reference held by the page's own object, whether or not the card's source finds a record.

#### Scenario: DqSociaalDomein De melding

- **WHEN** the card's source is the family plan and the entry reads the case's `caseType`
- **THEN** Zaaktype reads "Melding Jeugdwet"
