# widget-side-title-tone Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-side-title-tone](../../)

## Purpose

A card in a page's right column can be titled as the boards title side cards.

## ADDED Requirements

### Requirement: A widget can be titled as a side card

A widget definition SHALL take `titleTone: "side"`. CnDashboardPage and CnDetailWidgetHost SHALL pass it to the card
they draw the widget in, and in the board look that card's title SHALL be 15px, weight 600, in the muted text colour.
Without the key, and in the Nextcloud look, the title SHALL stay as it is.

#### Scenario: DqDagAfsluiten "Uw dag"

- **GIVEN** the end-of-day dashboard in the board look with the "Uw dag" widget set to `titleTone: "side"`
- **THEN** its card is titled at 15px, weight 600, muted
