# A chart shows the categories a host marks as selected

## Why
launchpad's cross-widget filter (`drill-down-cross-widget-filter` tasks 24 and 26) needs the chart a reader clicked to
show what it filters on, and to drop that mark when the filter goes: a pick on another chart replaces it, or the reader
removes it from the active-filters panel. CnChartWidget emits `select` but keeps no selection, so nothing on the chart
says which bar or slice is the filter.

## What changes
CnChartWidget takes `selected`, the raw keys of the categories to show as selected. A selected bar-list row is ringed in
the text colour, bold and `aria-pressed`; a selected bar or slice gets an outline in the text colour from the chart's
shadow-root rules, put back after every redraw. On a `selectable` chart ApexCharts' own click state (darkening, slice
expansion) is off, so the host's `selected` is the only selection.
