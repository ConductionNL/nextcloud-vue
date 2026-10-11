# detail-labels-board-look Delta: screens-detail-labels-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-detail-labels-parity](../../)

## Purpose

Detail page tab labels, side card titles and library strings in the user's
language, as the DqZaak and PtAccount boards draw them.

## ADDED Requirements

### Requirement: Detail labels read in the user's language

CnTabsWidget SHALL run a tab's authored `label`, and the child widget's title
when the tab has none, through the host's translate (`cnTranslate`). Under the
board look an activity tab without a label SHALL read the library's History,
which the Dutch catalogue SHALL render as "Historie". An integration card's
title SHALL go through the host's translate. The library catalogue SHALL hold
Dutch for "Show all {count} fields", "Show less", "No audit entries yet",
"Meetings", "No meetings" and "Open in Calendar".

#### Scenario: The DqZaak tab strip

- **GIVEN** a case detail page whose tabs are labelled Overview and Documents, and an app catalogue with Overzicht and Documenten, for a Dutch user
- **WHEN** it renders
- **THEN** the strip reads Overzicht and Documenten

@e2e include Read the tab strip on dossiq/DqZaak with the user language nl.

#### Scenario: A label without a translation

- **GIVEN** a tab labelled Knowledge that no catalogue translates
- **WHEN** it renders
- **THEN** the tab reads Knowledge

### Requirement: A side card takes its manifest title

Under the board look, a widget rendered as a card through CnDetailWidgetHost,
whose renderer declares a `title` prop, SHALL receive the manifest title
through the host's translate; an activity widget without a title SHALL receive
History. A `content.title` SHALL win. A widget in a tab panel, a renderer
without a `title` prop and every widget outside the board look SHALL render as
before.

#### Scenario: The PtAccount History card

- **GIVEN** a side column audit-trail widget titled Historie under the board look
- **WHEN** it renders
- **THEN** the card heading reads Historie, not Auditlogboek

@e2e include Read the side History card on portaliq/PtAccount with the user language nl.

#### Scenario: Without the board look

- **GIVEN** the same widget on a page without `look: "board"`
- **WHEN** it renders
- **THEN** the card keeps its own default title
