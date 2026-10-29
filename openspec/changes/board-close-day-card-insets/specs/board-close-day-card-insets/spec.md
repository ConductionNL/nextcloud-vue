# board-close-day-card-insets Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The card with the placed closing pair is drawn as the board

In the board look, a dashboard card that holds a placed `CnRecordNoteRows` closing pair SHALL draw its title and text
24px from its edge, and the pair SHALL stand in a band ruled across the card, its buttons 24px from the card's edges,
14px under the rule and 14px above the card's foot.

#### Scenario: DqDagAfsluiten Klaar voor vandaag?

- **THEN** the title, the sentence, Annuleren and the right edge of Dag afsluiten are 24px from the card's edges
- **AND** the rule spans the card and no further
