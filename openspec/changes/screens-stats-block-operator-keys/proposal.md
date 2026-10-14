---
kind: code
---

# Proposal: screens-stats-block-operator-keys

## Summary

A stats-block filter written the flat way a list page and a lens write it, `{ "meetingDate[gte]": "2026-01-01" }`, went
to OpenRegister's `/value` aggregation as `filter[meetingDate[gte]]`. The endpoint reads that as a field named
`meetingDate[gte]`, finds none and counts 0, so decidiq's Rapportages had to spell the nested form. #1567 fixed the same
mismatch for lens counts by routing them through the list endpoint. The stats block keeps the aggregation endpoint
(it also serves sums and averages) and sends the key in the nested form the endpoint reads: `filter[meetingDate][gte]`.

## Scope

- `src/utils/fetchAggregate.js`: `aggFilterParam`, used by `flattenAggFilter` (CnDeltaWidget, CnGaugeWidget,
  CnSummaryAggregates).
- `src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue` (`fetchValue`) and `src/components/CnStatWidget/CnStatWidget.vue`
  (`flattenFilter`, the stat tiles inside a stats-block grid).
- The grid layout of the stats block (#1580) is untouched. No manifest schema change.
