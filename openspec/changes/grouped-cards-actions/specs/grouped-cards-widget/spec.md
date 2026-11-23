# grouped-cards-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [grouped-cards-actions](../../)

## Purpose

A grouped-cards card can offer what to do with all its groups.

## ADDED Requirements

### Requirement: A grouped-cards widget can carry a row of actions above its groups

With `content.actions` CnGroupedCardsWidget SHALL draw those actions in one row before its groups, and SHALL draw the row
while it has no groups. Without `actions` it SHALL draw no row.

#### Scenario: DqZaaktype

- **GIVEN** the phases card with actions "View as flow" and "Add a task"
- **THEN** both buttons stand under the card's subtitle, above the phases
