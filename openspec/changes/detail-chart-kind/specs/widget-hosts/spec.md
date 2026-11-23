# widget-hosts Delta: detail-chart-kind

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-chart-kind](../../)

## Purpose

Draw the same chart config on a detail page as on a dashboard.

## ADDED Requirements

### Requirement: A detail chart reads chartKind as its type

CnDetailWidgetHost SHALL pass `content.chartKind` to the widget as `type` when the content has no `type` of its own, and SHALL NOT pass `chartKind` itself. A `content.type` SHALL win.

#### Scenario: The enforcement matrix

- **GIVEN** a detail page widget `{ type: "chart", content: { chartKind: "matrix", … } }`
- **WHEN** it renders
- **THEN** CnChartWidget receives `type: "matrix"`
