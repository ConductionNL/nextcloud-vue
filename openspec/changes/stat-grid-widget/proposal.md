# Proposal: stat-grid-widget

## Why

DqDagAfsluiten draws "Uw dag" as one card with four figures, two to a row: Geopend, Vastgelegd, Uren and Klaar te
zetten. Each is a label, a large figure and a line under it. Uren comes from humaniq, the others from dossiq. The library
has a `stat` per card and no way to put several figures in one card, let alone from two apps, so dossiq drew the day as a
list and Uren as a tile of its own.

## What changes

A `stat-grid` widget: `columns` (1 to 4, default 2), a shared `endpointSource` and `cells`. Each cell is a stat's content,
drawn flat and stacked. It reads the grid's endpoint unless it names its own `endpointSource`. A cell with `visibleWhen`
shows only once the condition holds; a condition that fails or cannot be read hides that cell and leaves the rest.

## Scope

nextcloud-vue, a new registered widget type; dossiq's Close out your day uses it (R22-DASH). No manifest schema change.
