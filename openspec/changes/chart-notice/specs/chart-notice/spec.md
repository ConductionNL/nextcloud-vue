# chart-notice Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [chart-notice](../../)

## Purpose

A chart can say in words what its data means for the record on the page.

## ADDED Requirements

### Requirement: A chart can carry a notice with record values

CnChartWidget SHALL draw a configured `notice` as a note card in its tone under the chart, with its translated `lead` in
bold and its translated `text`, each `{name}` filled from `values[name]` after token resolution and, where
`labels[name]` names a label map, in that map's translated words. It SHALL NOT draw the notice while a value is missing.

#### Scenario: DqHandhaving

- **WHEN** a handler opens an LHS advice whose matrix chart declares the advice notice
- **THEN** an info note under the matrix reads "Advies: last onder dwangsom" in bold, followed by the matrix version and
  the cell's behaviour and consequence in the matrix's own words
