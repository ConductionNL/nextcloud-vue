# A chart can say which category the reader picked

## Why
launchpad's cross-widget filter (`drill-down-cross-widget-filter` task 7) publishes a clause when a reader clicks a bar
or slice. Its charts are CnChartWidget, which handles the click inside itself (drilldown navigation) and keeps the raw
key internal, so the host never learns what was picked.

## What changes
CnChartWidget takes `selectable`. A slice, bar or bar-list row click then emits `select` with the grouped field
(`aggregate.groupBy`, `dataSource.groupBy`, else the drilldown's `filterParam`), the raw key, the label and the index.
The "Other" bucket emits nothing; a drilldown still navigates.
