# board-sections-card-heading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-sections-card-heading](../../)

## ADDED Requirements

### Requirement: A board stacked section card is titled as the dossiq settings cards

In the board look a CnSectionsWidget with `cards` that is not laid out in columns SHALL title each section card at 17px,
weight 700, on a line height of 1.3, as the dossiq settings boards draw a settings card title. The grid variant and the Nextcloud look SHALL keep their own
heading.

#### Scenario: PtPortalInstellingen

- **GIVEN** a portal's Instellingen tab in the board look
- **THEN** "Gegevens van de portal" reads 17px, weight 700, line height 22.1px
