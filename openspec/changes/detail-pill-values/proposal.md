# Proposal: detail-pill-values

## Why

dossiq's task page (DqTaak) draws a priority pill beside the state only for a high or urgent task ("Hoog"); a normal
task shows none. A header pill reads a field and draws whatever value it holds, so a manifest page would draw "Normal"
on every ordinary task.

## What changes

A header pill (`typePill`, `statusPill`) with `values` draws only when the field holds one of those raw values.
