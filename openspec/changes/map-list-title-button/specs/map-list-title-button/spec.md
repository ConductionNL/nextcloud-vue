# map-list-title-button Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [map-list-title-button](../../)

## Purpose

A row title in the map's numbered list reads as the row's title, whatever Nextcloud does to buttons.

## ADDED Requirements

### Requirement: A map list title reads as text, not as a button

The title of a row in an index page's map list SHALL be drawn as 15px weight 600 text in the main text colour, with no
fill, border, radius, margin, padding or minimum height, including on hover and focus, against Nextcloud's global
button rule. The focus outline SHALL stay.

#### Scenario: DqZakenKaart "Verlichting fietspad Lindelaan"

- **GIVEN** the case index in map view with a numbered list beside the map, under Nextcloud's server stylesheet
- **THEN** a row's title has no fill and no margin, its box is one line of text high, and the row is about 89px high
