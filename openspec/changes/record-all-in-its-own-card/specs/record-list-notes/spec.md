## ADDED Requirements

### Requirement: the record-every pair can stand in its own card

A notes list with `noteAction.recordAll.placement.widget` MUST put its cancel and record-every buttons at the foot of that dashboard card, without its own title and sentence, and MUST keep the whole block under its rows when that card is not on the page.

#### Scenario: DqDagAfsluiten
- GIVEN the text card "Klaar voor vandaag?" (widget `eod-ready`) after "Vandaag vastgelegd"
- THEN Annuleren and Dag afsluiten stand under a rule at that card's foot
- AND "Nog open van vandaag" ends after its last row
