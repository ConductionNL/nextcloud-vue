# board-card-title-gap-variants Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-title-gap-variants](../../)

## Purpose

A detail card's body starts as far below its title as the boards draw it, for each kind of body.

## ADDED Requirements

### Requirement: A board card starts its body as drawn for its kind of body

In the board look, on a detail page:

- a side card whose facts open on a lead SHALL pad its body 12px and set the lead's lines at their normal line height;
- a body card whose facts open on the column grid SHALL start its body 14px below the title's glyphs (14px minus
  `--cn-board-first-line-leading`);
- a body card whose facts open on running text SHALL pad its body 12px and set the text at line-height 1.6.

Other cards keep their spacing. The Nextcloud look keeps its own spacing.

#### Scenario: DqZaak "Aanvrager"

- **GIVEN** a case detail page in the board look with the "Aanvrager" side card
- **THEN** the requester's name starts 15.5px (within 0.5px) below the card's title

#### Scenario: DqOrganisatie "Organisatie"

- **GIVEN** an organisation detail page in the board look with the "Organisatie" facts card
- **THEN** its first label starts 14px (within 0.5px) below the card's title

#### Scenario: DqZaak "Het verzoek"

- **GIVEN** a case detail page in the board look with the "Het verzoek" card
- **THEN** its text starts 15px (within 0.5px) below the card's title
