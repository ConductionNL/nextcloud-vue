# board-sections-card-heading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-sections-card-heading](../../)

## ADDED Requirements

### Requirement: A board stacked section card is titled at 700 on a 1.2 line

In the board look a CnSectionsWidget with `cards` that is not laid out in columns SHALL title each section card at
weight 700 on a line height of 1.2, keeping its 18px size. The grid variant and the Nextcloud look SHALL keep their own
heading.

#### Scenario: PtPortalInstellingen

- **GIVEN** a portal's Instellingen tab in the board look
- **THEN** "Gegevens van de portal" reads 18px, weight 700, line height 21.6px
