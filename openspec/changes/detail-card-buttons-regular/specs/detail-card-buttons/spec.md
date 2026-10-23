# detail-card-buttons Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-card-buttons-regular](../../)

## ADDED Requirements

### Requirement: A detail page can draw its card header buttons at the control height

CnDetailPage SHALL take `cardButtons`: `compact` (default) keeps a labelled card-header button at 34px in the board
look; `regular` SHALL draw the labelled buttons in the title rows of the page's cards at `--cn-board-control-height`
(40px). Menu triggers and icon-only buttons keep their own size. The Nextcloud look is unchanged.

#### Scenario: DqZaakContact

- **GIVEN** the case page with `cardButtons: "regular"`
- **THEN** "Groot incident melden" and "Gesprek starten" in the "Live gesprek" card are 40px tall

#### Scenario: DqZaaktypeOverzicht

- **GIVEN** a case-type page without `cardButtons`
- **THEN** "Regel toevoegen" stays 34px
