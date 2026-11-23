# related-objects Delta: related-groups-by-relation

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [related-groups-by-relation](../../)

## Purpose

Draw a record's related objects by relation type, as the boards do.

## ADDED Requirements

### Requirement: Related objects can be grouped by relation type under headings

With `groupByRelation`, CnRelatedObjectsWidget SHALL split its Objects group into one group per `relation.displayLabel` on the uses/used rows (through the host translate), in first-seen order, keeping rows without a label in Objects. With `layout: "sections"` it SHALL draw every visible group under its own heading in one list instead of tabs. A group with an action (`groupActions[<key>]`, or an extra section's `action`) SHALL show it on its heading; pressing it SHALL dispatch the action and emit `group-action`. Without these keys the widget SHALL render as before.

#### Scenario: Related cases

- **GIVEN** a case related to one case as "Onderwerp van deze zaak" and another as "Wacht op", and a host section "Gepland vervolg" with the action "Vervolg plannen"
- **WHEN** the widget renders with `groupByRelation` and `layout: "sections"`
- **THEN** three headings show in that order, each over its cases, and "Vervolg plannen" sits on the last heading
