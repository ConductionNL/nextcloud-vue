# dashboard-page Delta: widget-title-eyebrow

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-title-eyebrow](../../)

## Purpose

A widget card can say what kind of thing its title is about, on a line above it.

## ADDED Requirements

### Requirement: A widget card can carry a line above its title

A dashboard widget definition with `eyebrow` SHALL show that text, through the host translate, on a line above the
card's title: 13px, in the muted text colour, aligned with the title. A widget without `eyebrow` SHALL render its header
as before.

#### Scenario: The forecast card

- **GIVEN** a widget `{ "title": "Prognose 13 weken", "eyebrow": "Saldo per week" }` on a dashboard
- **WHEN** the page renders
- **THEN** "Saldo per week" stands above "Prognose 13 weken" in the card header, smaller and muted
