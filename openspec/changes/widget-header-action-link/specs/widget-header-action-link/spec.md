# widget-header-action-link Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-header-action-link](../../)

## Purpose

A widget header action can read as the card's text link.

## ADDED Requirements

### Requirement: A widget header action can be a text link

A widget `headerActions` entry with `variant: "link"` SHALL render in the card's title row as a button styled as a
text link (primary ink, underlined, no icon, no frame) and SHALL run its action on click. Any other variant keeps the
primary or secondary button.

#### Scenario: DqTermijnen Kwartaalrapport

- **GIVEN** the Kwartaalrapport card with `{ label: "Download quarterly report", variant: "link", action: { type: "export" } }`
- **THEN** "Kwartaalrapport downloaden" is an underlined link at the end of the title row, and a click starts the export
