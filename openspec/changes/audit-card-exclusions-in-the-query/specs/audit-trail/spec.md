# audit-trail Delta

## ADDED Requirements

### Requirement: A history card asks the trail to leave out what it hides

A history card that leaves out actions (`excludeActions`) or actors (`excludeActors`) SHALL send them to the object
trail it reads, and to every related record's trail, as `action[notIn]` and `user[notIn]`, so the exclusions apply
before the page limit. The card SHALL keep filtering what the trail answers.

#### Scenario: DqSociaalDomein side Historie

- **GIVEN** a case with thousands of `read` rows and System updates over one `file.downloaded` row by Fatma Kaya
- **AND** a consent of the case whose trail holds 140+ System rows over Fatma Kaya's `create`
- **WHEN** the side Historie reads with `excludeActions: ["read"]`, `excludeActors: ["System"]` and the consent as a
  related source
- **THEN** it shows "Inzage medisch verslag" and "Toestemming vastgelegd"

#### Scenario: Nothing left out

- **WHEN** the card names no exclusions
- **THEN** its trail reads carry no `action[notIn]` or `user[notIn]`
