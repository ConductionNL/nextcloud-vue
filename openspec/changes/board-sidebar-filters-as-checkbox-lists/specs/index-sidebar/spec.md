# index-sidebar Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-sidebar-filters-as-checkbox-lists](../../)

## ADDED Requirements

### Requirement: The board look draws a short filter as a checkbox list with counts

In the board look the index sidebar SHALL draw a multi-value filter field with at most 12 values as checkbox rows, each
with the value and its facet count, ticked when the value is active; toggling a row SHALL emit the field's new values.
A single-choice field SHALL be a list too, where ticking a row replaces the other; a reference field SHALL be a list
when its facet carries the buckets. A reference without a facet, or a field with more than 12 values, SHALL keep its picker. "Clear all" SHALL sit beside the Filters heading. The
Nextcloud look SHALL be unchanged.

#### Scenario: DqZakenSorteren

- GIVEN the Cases side panel with the team filter on Woo en informatie
- THEN Team lists "[x] Woo en informatie 19", "[ ] Vergunningen 12", ..., and "Alles wissen" stands beside "Filters"

#### Scenario: Team, Status and Zaaktype as the server declares them

- GIVEN the server declares Team a single choice and Status and Zaaktype references, each with facet buckets
- THEN all three draw as rows ("Woo-verzoek 9"), and ticking "Vergunningen" under Team emits only "Vergunningen"
