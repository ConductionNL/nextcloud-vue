# header-link-under-title Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-link-under-title](../../)

## Purpose

A card's way to its whole list can sit where the board draws it.

## ADDED Requirements

### Requirement: A header link can sit under the title

With `headerLink.placement: "title"` CnWidgetWrapper SHALL draw the header link under the title, in the title block, and
SHALL NOT draw it among the header actions. Without the key the link SHALL stay among the actions.

#### Scenario: DqDashboard

- **GIVEN** Vastgelopen zaken with `headerLink: { label: "View all", route: "Cases", placement: "title" }`
- **THEN** "Alles bekijken" stands under "Vastgelopen zaken" and the header has no actions
