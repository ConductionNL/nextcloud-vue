## MODIFIED Requirements

### Requirement: Saved views keep a meaningful order

The saved-views tree SHALL list seeded views in the order the app declares them and the reader's own views in the order
they were saved (oldest first), with undated own views after them by name.

#### Scenario: DqFilterBeheren
- GIVEN defaults Mijn zaken, Alle lopende zaken, Termijn verstreken and own views saved as Termijn deze week, Wacht op inwoner, Opgeschort
- THEN the panel lists them in exactly those orders
