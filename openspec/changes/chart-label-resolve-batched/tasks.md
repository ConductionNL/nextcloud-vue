# Tasks: chart-label-resolve-batched

- [x] 1. `CnChartWidget.fetchAggregateRefsBatch`: one `_ids` list read for the uncached keys, store and axios paths; `resolveAggregateRefs` falls through to the per-id read only for a key the batch did not return.
- [x] 2. `tests/components/CnChartWidgetLabelBatch.spec.js`: one list request and no per-id GET; cached ids left out; a key missing from the batch read on its own; a dangling key reads "Unknown"; a server ignoring `_ids` labels nothing wrongly; a failing batch falls back; one key reads per id.
