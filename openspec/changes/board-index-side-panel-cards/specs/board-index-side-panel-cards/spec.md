# board-index-side-panel-cards Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-index-side-panel-cards](../../)

## Purpose

The cards beside an index page's list look like the board's side cards.

## ADDED Requirements

### Requirement: A board index side-panel card is the board's side card

In the board look a card in an index page's side panel SHALL draw no rule under its header, SHALL put its title on the
card's 20px 22px inset as a `--cn-board-side-heading-size` (15px) weight 600 muted label at line height `normal`, and
SHALL start its body 12px below the title less `--cn-board-first-line-leading`. A header note SHALL be 13px. The cards
SHALL sit `--cn-board-section-gap` (20px) apart.

#### Scenario: DqTeamwachtrij "Team vandaag"

- **GIVEN** the queue page in the board look with the "Team vandaag" side card
- **THEN** its title starts 22px from the card's left edge and 20px below its top border, in the muted text colour
- **AND** no rule is drawn under the title

### Requirement: A board record list table is the board's compact grid

In the board look a record list drawn as a table SHALL draw its header cells at 13px, regular weight, and SHALL draw no
rule under the header or the rows; its cells SHALL have 2px block padding (the header 2px below only).

#### Scenario: DqTeamwachtrij "Werkvoorraad per zaaktype"

- **GIVEN** the "Werkvoorraad per zaaktype" side card
- **THEN** the "Zaaktype / Open / Wacht" header reads 13px regular and the rows carry no rules
