# board-active-filters-right-of-hint Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-active-filters-right-of-hint](../../)

## ADDED Requirements

### Requirement: The active filters sit at the right of the board view's hint

In the board look, when the board view's hint is shown in the search row, the active filters ("Active:", the chips and
"Clear all") SHALL sit at the right end of the hint's line. Without a hint the active filters SHALL keep following the
search field. The Nextcloud look SHALL be unchanged.

#### Scenario: DqWerkbord

- GIVEN the Cases board view narrowed to Woo-verzoek with one active filter
- THEN the hint reads on the left and "Actief: [Zaaktype: Woo-verzoek ×] Alles wissen" ends at the right edge of the bar

#### Scenario: DqZaken

- GIVEN the Cases table with two active filters and no board hint
- THEN "Actief:" follows the search field as before
