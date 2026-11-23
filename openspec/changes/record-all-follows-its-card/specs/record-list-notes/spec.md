# record-all-follows-its-card Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The placed pair follows its card

A notes list with `noteAction.recordAll.placement.widget` SHALL put its closing pair in that card whenever the card is
on the page, also when the card comes on the page after the list or is drawn again, and SHALL keep the pair under its
rows while the card is not on the page.

#### Scenario: the card comes later

- **GIVEN** the list mounted before the "eod-ready" card
- **WHEN** the card comes on the page
- **THEN** Annuleren and Dag afsluiten stand at its foot, and not under the rows

#### Scenario: the grid draws the card again

- **GIVEN** the pair at the foot of the "eod-ready" card
- **WHEN** the grid replaces that card with a new one
- **THEN** the pair stands at the foot of the new card
