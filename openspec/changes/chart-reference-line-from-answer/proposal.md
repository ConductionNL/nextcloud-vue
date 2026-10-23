# Proposal: chart-reference-line-from-answer

## Why

DqDoorlooptijd draws a dashed "norm 28 dagen" over the processing time per month. The norm is a figure the endpoint
works out (it depends on the case types in the chart), and a reference line only took a fixed `value`. The same chart
can group per year, and `categoryFormat: "month"` read a bare year key ("2026") as January.

## What changes

A reference line may read its value from the chart's endpoint answer (`valuePath`) and write it in its label
(`{value}`); a line whose value is missing is not drawn. `categoryFormat: "month"` and `"month-year"` leave a key that
names only a year as it is.

## Scope

CnChartWidget. No schema change.
