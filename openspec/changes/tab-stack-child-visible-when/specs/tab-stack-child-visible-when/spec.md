# tab-stack-child-visible-when Delta: tab-stack-child-visible-when

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [tab-stack-child-visible-when](../../)

## Purpose

A widget in a tab stack on a detail page shows under the same condition as it would in the grid.

## ADDED Requirements

### Requirement: A widget in a tab stack on a detail page follows its own condition

On a detail page CnTabsWidget SHALL draw a widget of a tab stack (`widgetIds`) only while its own `visibleWhen` holds,
when that condition reads a field of the record or of a record the page's `visibilityContext` names
(`@context.<name>`), evaluated as a grid widget's condition is. While those records load the widget SHALL NOT draw.
Without a record, and for a condition that needs a request, the widget SHALL draw as before.

#### Scenario: Board PqContactmoment

- **GIVEN** a ticket tab stack holding a card with `visibleWhen: { field: "kind", op: "eq", value: "interaction" }`
- **WHEN** the ticket's kind is "question"
- **THEN** the card is not drawn
- **AND** on an interaction ticket it is drawn

#### Scenario: A dashboard

- **GIVEN** the same stack on a page without a record
- **THEN** every widget of the stack draws
