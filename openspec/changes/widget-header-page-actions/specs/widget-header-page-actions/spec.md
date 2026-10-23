# widget-header-page-actions Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-header-page-actions](../../)

## Purpose

A card's header button can act on the detail page it sits on: edit the record, or open another tab.

## ADDED Requirements

### Requirement: A widget header button can open the page's edit form or another tab

On a detail page:

- `CnDetailPage` SHALL provide `cnRecordEdit` with `available` (whether the page offers its record Edit) and `open()`;
- a widget header action whose action is `{ type: 'edit-record' }` SHALL open the page's record edit form, and SHALL be
  left out where `available` is false or no detail page provides it;
- a widget header action whose action is `{ type: 'open-tab', tab }` SHALL open that tab through the `#<tab>` anchor;
- neither SHALL reach the generic action dispatcher.

#### Scenario: DqZaaktype "Termijnen" Bewerken

- **GIVEN** a case type page that offers Edit, its Terms card declaring an `edit-record` header action
- **WHEN** the user presses Bewerken on the card
- **THEN** the case type's edit form opens

#### Scenario: DqZaaktypeOverzicht "Statussen" Bewerken

- **GIVEN** the case type page's Overview tab, its Statuses card declaring `{ type: 'open-tab', tab: 'statuses' }`
- **WHEN** the user presses Bewerken on the card
- **THEN** the Statuses tab opens
