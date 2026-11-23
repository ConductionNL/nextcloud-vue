## ADDED Requirements

### Requirement: A user field shows the user's display name

A field declaring `referenceType: nextcloud-user` SHALL show the user's display name in read mode, and the uid only while the name loads or when the directory cannot name the user.

#### Scenario: The assignee reads as a name
- **GIVEN** a case whose `assignee` is `thomas.kuiper`, display name "Thomas Kuiper"
- **WHEN** a data widget shows the assignee
- **THEN** it SHALL read "Thomas Kuiper"

@e2e exclude Asserted in tests/components/CnObjectDataWidgetUserName.spec.js; the directory lookup is mocked there and checked on a live instance.
