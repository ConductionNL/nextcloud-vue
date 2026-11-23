# Proposal: flow-board-palette-groups

## Why

Board DqFlow draws a palette of nine steps in four groups (Dossiq, OpenRegister, Integriq, Filinq) under the words a
case worker uses ("Beslistabel", "Externe aanroep"). The flow board listed the whole node catalogue, 65 steps of every
installed app, grouped by app id, so the palette card ran several screens long and pushed the canvas card to the same
height.

## What changes

CnFlowBoard and CnFlowEditorPage take `paletteGroups` (manifest `config.paletteGroups`):
`[{ app?, label?, tone?, entries: [{ type, label?, short? }] }]`. When set, the palette draws only those groups and steps,
in that order, under those labels; a step the catalogue lacks is left out and an empty group is not drawn. The rest of
the catalogue stays one click away: "More steps" under the groups opens the searchable step picker. `tone` and `short`
are carried on the entries for the step pill on the canvas. Without `paletteGroups` nothing changes.

## Reach

Flow pages that set `config.paletteGroups`. No schema change.
