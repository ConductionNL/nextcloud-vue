# kb-search-board-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [kb-search-board-rows](../../)

## Purpose

The knowledge base card reads as drawn on the client boards.

## ADDED Requirements

### Requirement: The manifest placeholder reads in the reader's language

CnKbSearchWidget SHALL pass `content.placeholder` through the injected `cnTranslate` when there is one, and show it as
written when there is none.

#### Scenario: PqOrganisatie Kennisbank in Dutch

- **GIVEN** a client page whose kb-search widget sets `placeholder: "Search the knowledge base"` and an app catalogue that translates it
- **THEN** the field's placeholder reads "Zoek in de kennisbank"

### Requirement: A board suggestion is a link row

In the board look a suggested article SHALL be a link row without border or padding, its book icon 8px before the
title, the title 14px regular, underlined, in the link ink. The Nextcloud look SHALL keep its result cards.

#### Scenario: PqOrganisatie suggestions

- **GIVEN** a client page in the board look with two suggested articles
- **THEN** "Evenementenvergunning: wat regel je" and "Verhuizen binnen Zuiddrecht" stand as link rows under the field, each with the book icon before it
