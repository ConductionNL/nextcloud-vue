# board-tabs-widget-border Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tabs-widget-border](../../)

## Purpose

The folder tabs and the widget card they open onto share one border.

## ADDED Requirements

### Requirement: Board folder tabs draw the widget card border

In the board look every folder tab, open or not, SHALL draw its outline in `--color-border`, the token of the widget
card border, at 1px. The Nextcloud look is unchanged.

#### Scenario: DqZaak tab strip over the Overzicht card

- **GIVEN** a case detail page in the board look
- **THEN** "Overzicht", "Documenten", "Contact", "Taken" and "Historie" draw the same 1px border colour as the card below
