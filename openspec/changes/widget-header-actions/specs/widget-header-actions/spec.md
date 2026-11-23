# widget-header-actions Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-header-actions](../../)

## Purpose

A card's title row carries the buttons the manifest declares for its widget.

## ADDED Requirements

### Requirement: A widget declares buttons for its card header

A widget definition SHALL take `headerActions`, a list of `{ label, icon?, variant?, visibleWhen?, action }`. An
entry without a label or an action object SHALL be ignored. The label SHALL go through the host's translate.
`visibleWhen` SHALL be decided on the record, and an entry whose condition the page cannot decide SHALL be left out.
A click SHALL dispatch `action` through the page's dispatcher with `@objectId` and `@object.<field>` resolved.

#### Scenario: DqZaak "Flows"

- **GIVEN** the case's flow-runs widget with a header action "Run flow" that opens a dialog
- **THEN** the "Flows" card shows "Flow uitvoeren" in its title row, and a click opens the dialog for this case

### Requirement: The card that titles a widget draws its header actions

On a card surface CnDetailWidgetHost SHALL provide the resolved buttons, and the outermost CnWidgetWrapper or
CnDetailCard below it SHALL draw them in its title row; a card inside that card SHALL NOT draw them again. A title-less
card SHALL get a header for them. In bare mode the host SHALL provide none, and CnTabsWidget SHALL draw a single
widget's buttons in its panel heading, or on a row of their own when the panel has no heading.

#### Scenario: DqZaakHistorie

- **GIVEN** the history tab's widget with a header action "Add note"
- **THEN** "Notitie toevoegen" stands beside the panel's title, not inside the widget
