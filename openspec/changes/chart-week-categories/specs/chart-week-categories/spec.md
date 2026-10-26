# chart-week-categories Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A chart can name ISO week categories as short weeks

With `categoryFormat: "week"` a chart SHALL write a category `YYYY-Www` as "w{week}" without a leading zero, and SHALL
leave any other category as it is.

#### Scenario: DqProcesanalyse Doorstroom

- **GIVEN** the categories `2026-W30`, `2026-W31` and `2026-W05`
- **THEN** the x-axis reads "w30", "w31" and "w5"
