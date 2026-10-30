# record-list-headline-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A row can put its pill, title and meta on one line

A `rows` record list with `headLine: true` SHALL draw the row's pill, title and meta on one line in that order, the
title underlined as a link, and SHALL draw the row's `text` under that line in the normal ink. It SHALL not draw the
pill again at the end of the row.

#### Scenario: DqDagAfsluiten Vandaag vastgelegd

- **GIVEN** a recorded note on case 2026-0110 with `pill: { field: "kindLabel" }`, `meta: "{recordedMeta}"`,
  `text: "{note}"` and `headLine: true`
- **THEN** the row reads "Zaak", "Verlichting fietspad Lindelaan", "2026-0110 · 15:40" on its first line
- **AND** the note "Drie documenten beoordeeld..." under it

### Requirement: A row's icon tile can take a size and a tone

A `rows` record list with `iconTile: { size, tone }` and an `icon` SHALL draw the tile `size` px round, and with a
`tone` of `success`, `info`, `warning` or `error` on that tone's soft ground in its ink. `iconTile: true` keeps the
36px tile on the sunken ground.

#### Scenario: the done mark before a recorded note

- **GIVEN** `icon: "Check"` and `iconTile: { size: 24, tone: "success" }`
- **THEN** each row leads with a 24px round tile on the success ground with a check in the success ink
