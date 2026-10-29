## ADDED Requirements

### Requirement: A plan card can carry a note beside its title

The plan widget SHALL report `content.headerNote` (a string, translated through the app's translate) as the card
header's note when it is set, and report no header otherwise.

#### Scenario: the case plan's note
- **GIVEN** a case plan card with `headerNote` "Milestones and parts of this case"
- **THEN** the Zaakplan card's title row ends with "Mijlpalen en onderdelen van deze zaak"
- **AND** no line is drawn under the title
