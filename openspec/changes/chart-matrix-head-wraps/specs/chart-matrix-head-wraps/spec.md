# chart-matrix-head-wraps Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A matrix column head stays in its column

A CnChartWidget matrix column head SHALL break a name longer than its column inside that column and SHALL NOT overflow
into the next column.

#### Scenario: DqProcesanalyse Dagen per fase

- **GIVEN** nine phase columns of 89px
- **THEN** "Beoordeling ontvankelijkheid" wraps within its own column
