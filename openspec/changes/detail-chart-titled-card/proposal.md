# Proposal: detail-chart-titled-card

## Why

A chart on a detail page rendered bare: its manifest `title` and `subtitle` never showed and it sat on the page without
an edge. Board DqHandhaving draws "Advies volgens de Landelijke Handhavingsstrategie" as a titled card with the line
"Het gekozen vak is omlijnd" under the title. Every other body widget on a card surface gets that card (ADR-062).

## What changes

CnDetailWidgetHost wraps a titled `chart` widget on a card surface in CnWidgetWrapper with its title, subtitle and icon,
and hands the chart the whole prop bag so record tokens in `cellSource` and `dataSource` still resolve. In a tab panel
(`chrome: "bare"`) and without a title it stays bare.
