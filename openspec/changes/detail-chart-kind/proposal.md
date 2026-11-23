---
kind: code
---

# Proposal: detail-chart-kind

## Summary

A dashboard reads a chart's kind from `content.chartKind` and hands it to CnChartWidget as `type`. CnDetailWidgetHost passes a widget only the content keys it declares as props, and CnChartWidget declares `type`, not `chartKind`, so a chart on a detail page (DqHandhaving) lost its kind and drew the default. The host now reads `content.chartKind` as `type`; an explicit `content.type` wins.

## Scope

- `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`: `declaredContent`.
- No schema change.
