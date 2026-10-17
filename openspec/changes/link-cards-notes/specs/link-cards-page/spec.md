# link-cards-page Delta: link-cards-notes

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [link-cards-notes](../../)

## Purpose

A card on a links page says something about what it opens, and the page can hold what only administrators need.

## ADDED Requirements

### Requirement: A card can carry a note with a tone

A card's `note` SHALL render as a chip under its description: a string as a neutral chip, an object in its `tone` (neutral, success, warning, error, info). A note's `counts` SHALL each be read with one `_limit=1` list request and fill `{name}` in its text; `textOne` SHALL be used when the count named by `when` (else the first count) is 1. Of a list of notes the first that applies SHALL show; a note with `when` applies only while that count is above 0. A note whose counts are loading or failed SHALL NOT show.

#### Scenario: Integrations with one failing connection

- **GIVEN** the Integrations card with a red note `when: "errors"` and a calm fallback
- **WHEN** one connection has an error
- **THEN** the card shows "1 koppeling heeft een fout" in red

### Requirement: A card ends in a chevron or an external-link icon

An in-app card SHALL end in a chevron and an external card in an external-link icon titled "Opens in a new tab".

#### Scenario: Documentation

- **THEN** the Documentation card ends in the external-link icon

### Requirement: A card can open the user settings

A card with `action: "user-settings"` SHALL open CnAppRoot's user settings modal on a click and SHALL be left out where no such modal is provided.

#### Scenario: Persoonlijke instellingen

- **WHEN** the user clicks Persoonlijke instellingen
- **THEN** the user settings modal opens and the page stays

### Requirement: An admin panel under the cards

With `config.adminPanel` (or content in the `#admin` slot) the page SHALL draw, under the cards and to administrators only, a panel with an "Administrators only" pill, the panel text and its link, and the custom component `adminPanel.component` names beside it.

#### Scenario: A user who is not an administrator

- **THEN** the panel is not drawn
