# dashboard-description-filters-in-order Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-description-filters-in-order](../../)

## Purpose

The description line of a dashboard header draws its controls as the board orders them.

## ADDED Requirements

### Requirement: The description line draws its page filters in declared order

CnDashboardPage SHALL draw the page filters with `placement: "description"` in the order of `pageFilters`, whatever
their control, before a `dateRange` period group on that line. A select SHALL be followed by a middle dot only when a
segmented group follows it.

#### Scenario: DqProcesanalyse

- **GIVEN** `pageFilters` statistic (segmented), period and caseType (selects), all on the description line
- **THEN** the line draws the segmented group, then the period select, then the case-type select, without a dot between
  or after the selects

#### Scenario: DqDoorlooptijd

- **GIVEN** `pageFilters` caseType (select) then granularity (segmented), both on the description line
- **THEN** the line draws "alle zaaktypen · Maand | Kwartaal | Jaar"
