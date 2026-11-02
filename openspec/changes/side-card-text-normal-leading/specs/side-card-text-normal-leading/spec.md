# side-card-text-normal-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [side-card-text-normal-leading](../../)

## ADDED Requirements

### Requirement: A side card's texts read at normal leading

In the board look the texts of a detail page's side cards (countdown sub line, facts link and note, linked widget empty line, status explanation and dwell line, attention flag heading and hint) SHALL read at the font's normal line height, so each side card is as tall as the board draws it.

#### Scenario: DqZaak side column

- GIVEN the case "Verlichting fietspad Lindelaan" in the board look
- THEN the Termijn card is 188px and the Werkinstructie card 144px tall, as the board

#### Scenario: Gekoppeld's rows and actions (DqZaak r43)

- **GIVEN** a case's Gekoppeld card in the side column, with a two-line dossier row, a pipelinq row and the Nieuw project / Openen in Planninq actions
- **THEN** the row links and the actions read at the normal line height too, so the card is as tall as drawn and Werkinstructie and Status stand where the board draws them

#### Scenario: Gekoppeld starts 10px under its title and its actions sit flush (DqZaak r44)

- **GIVEN** a case's Gekoppeld card in the side column, its rows and empty line at the normal line height
- **THEN** the first row starts 10px under the title, as drawn, with no half-leading taken off
- **AND** its row buttons and empty-state actions carry no margin, so Nextcloud's 3px button margin does not make the action line 23px where the board draws 17
