# dashboard-page Delta: screens-dashboard-widget-header

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-dashboard-widget-header](../../)

## Purpose

A widget's own card header reads the same on a dashboard as on a detail page.

## ADDED Requirements

### Requirement: A dashboard card shows the header its widget reports

When a registry widget on a dashboard page emits `header` with `{ link, note, action }`, the page SHALL draw the link,
the note and the action in that widget's card header. A `headerLink` on the placement or on the widget definition
SHALL win over the reported link. A widget that reports nothing SHALL keep the link its content asks for.

#### Scenario: A counted record list

- **GIVEN** a `record-list` widget with `headerLink.label` "Alle {total} verzoeken" and `headerNote` "{total} in totaal"
- **AND** the list's total is 7
- **WHEN** the dashboard renders
- **THEN** the card header reads "Alle 7 verzoeken" as a link and "7 in totaal" as a note

#### Scenario: A widget that reports nothing

- **WHEN** a widget emits no `header` event
- **THEN** no note is drawn and the link is the one its content asks for
