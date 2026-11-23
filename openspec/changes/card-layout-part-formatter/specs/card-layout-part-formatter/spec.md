# card-layout-part-formatter Delta: card-layout-part-formatter

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [card-layout-part-formatter](../../)

## Purpose

A card's meta line reads as plain text, as board DqAanMijToegewezen draws it, also for a field the table draws as a badge.

## ADDED Requirements

### Requirement: A card meta part can name its own formatter

A `cardLayout.meta` part SHALL be either a field name or `{ field, formatter?, formatterOptions? }`. A part object
SHALL read as plain text: its value through the named formatter from the host's formatter registry, else as text, and
SHALL NOT draw a page column's widget. A field name SHALL keep reading through the page column it names.

#### Scenario: Board DqAanMijToegewezen

- **GIVEN** a meta line `[{ field: "caseType", formatter: "caseTypeName" }, "initiatorDisplayName"]` and a case type
  column drawn as a badge
- **THEN** the card's meta line reads "Melding · B. Smit" as text, with no badge
