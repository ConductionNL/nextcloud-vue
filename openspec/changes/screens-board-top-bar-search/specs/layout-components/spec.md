# layout-components Delta: screens-board-top-bar-search

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-board-top-bar-search](../../)

## Purpose

The top bar's search field says what the app's search finds, and the brand
block has the board's width.

## ADDED Requirements

### Requirement: The board look names what the header search finds

Under the board look, when the manifest declares `nav.searchPlaceholder` and
Nextcloud's `#header` exists, `CnAppRoot` SHALL show the translated line as
the text of the resting search field's label (`.unified-search-input__label`).
The library SHALL change only that text: it SHALL NOT add, move or remove an
element Nextcloud drew, and SHALL keep Nextcloud's text node where there is
one. When Nextcloud re-renders the field, the line SHALL be shown again. On
unmount Nextcloud's own line SHALL be restored. Without the board look,
without the key, or without `#header`, the field SHALL keep Nextcloud's line.

#### Scenario: dossiq's line

- **GIVEN** dossiq under the board look with `nav.searchPlaceholder: "Search cases, documents or contacts"` and a Dutch translation "Zoek zaken, documenten of contacten"
- **WHEN** a dossiq page renders for a Dutch user
- **THEN** the top bar's search field reads "Zoek zaken, documenten of contacten"

#### Scenario: Nextcloud re-renders the field

- **GIVEN** the app's line on the field
- **WHEN** Nextcloud replaces the field
- **THEN** the new field shows the app's line again

#### Scenario: Leaving the app

- **GIVEN** the app's line on the field
- **WHEN** the app root unmounts
- **THEN** the field shows Nextcloud's own line

@e2e exclude Jest drives a Nextcloud 34 header fixture (tests/components/CnHeaderSearchLabel.spec.js); the live check is the DqZaken top-bar pixel diff.

## MODIFIED Requirements

### Requirement: The board look draws the brand block in the Nextcloud header

The block SHALL be a 237px brand link followed, 12px on, by a 1px by 28px
divider (250px in all), as `dossiq/DqKop` draws it. The rest of the
requirement is unchanged.

#### Scenario: The block's width

- **GIVEN** the brand block in the header
- **WHEN** it renders
- **THEN** the brand link is 237px wide and the divider starts 12px after it

@e2e exclude Jest pins the stylesheet (tests/components/CnBrandBar.spec.js); the live check is the DqKop top-bar pixel diff.
