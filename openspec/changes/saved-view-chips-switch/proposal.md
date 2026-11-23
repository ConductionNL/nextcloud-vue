# Proposal: saved-view-chips-switch

## Why

Under the board look the index toolbar draws every saved view as a chip, and with many views the chips wrap onto a
second and third row. The boards draw no chips on DqZaken, DqZakenSorteren, DqZakenKaart, DqWerkbord or DqFilterBeheren:
the views are listed in the side panel's Weergaven tab (CnSavedViewsPanel), and the toolbar keeps only "Weergave
opslaan".

## What changes

CnSavedViewsControl takes `chips` (default `true`); with `false` it draws only Save view. CnIndexPage takes
`savedViewChips` (manifest `config.savedViewChips`, default `true`) and hands it on.

## Scope

nextcloud-vue; dossiq sets `savedViewChips: false` on the pages above (DQ-LISTS). Default behaviour is unchanged. The
manifest page config is open, so no schema change.
