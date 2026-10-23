# Proposal: chart-matrix-label-width

## Why

DqProcesanalyse draws "Dagen per fase" with a 240px case-type column and the phases sharing the rest. A matrix sized its
label column to the longest label, so one long case-type name ("Omgevingsvergunning kleine bouwactiviteit") pushed every
cell right and narrowed the phase columns.

## What changes

A chart takes `matrixLabelWidth` (px): the matrix's row-label column is that wide and a long label wraps. Without it the
column keeps sizing to its longest label (at least 120px). CnDashboardPage forwards the key.

## Scope

nextcloud-vue CnChartWidget and CnDashboardPage; dossiq's process analysis uses it (R22-DASH). The chart props in the
manifest schema are open, so no schema change.
