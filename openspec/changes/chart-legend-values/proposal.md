# Proposal: chart-legend-values

## Summary

A pie or donut chart can name each slice with its value in the legend (`legendValues: true`): "Afval 18".

## Why

Measurement pl3 (28 October 2026), pipelinq board PqOperationeel: "Verzoeken per categorie" draws the ring with its total in the middle and, on the right, each category with its count. The ring's total and the legend's place are ApexCharts options a manifest can already set; the count beside each name needs a legend formatter, which JSON cannot carry.

## What changes

- `CnChartWidget` prop `legendValues` (default false): for pie and donut charts the legend formatter writes the escaped name and the slice's value in the chart's value format.
- `CnDashboardPage` forwards `legendValues` from a manifest chart's content.
- The v1 manifest schema lists the key among the forwarded chart keys. The v2 props bag stays open, so its version does not move.
- `tests/components/CnChartWidgetLegendValues.spec.js`.
