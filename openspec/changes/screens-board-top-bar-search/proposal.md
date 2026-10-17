---
kind: code
depends_on: [screens-brand-block-top-bar]
---

# Proposal: screens-board-top-bar-search

## Summary

Measured on 16 Oct against `dossiq/DqZaken` and `pipelinq/PqLeads`: the top
bar alone differs from the board by about 8.4% on every dossiq and pipelinq
page. Two of the causes are the library's:

1. The search field shows Nextcloud's global line ("Search apps, files, tags,
   messages …", English on Nextcloud 34.0.0 because its Dutch catalogue lacks
   that key). The boards give each app its own line: "Zoek zaken, documenten
   of contacten" in dossiq, "Zoek tickets, contacten of afspraken" in
   pipelinq.
2. The brand block is 13px too narrow. `DqKop` draws a 237px brand link, then
   12px, then the 1px divider; the library drew 237px INCLUDING the divider,
   so the grid button and everything after it sat 13px early.

This change:

1. Adds `nav.searchPlaceholder` (an i18n key) to the v2 manifest. Under the
   board look on a page with `#header`, `CnAppRoot` mounts a renderless
   `CnHeaderSearchLabel` that writes that line into the resting search
   field's label, writes it again when Nextcloud re-renders the field, and
   puts Nextcloud's line back on unmount.
2. Makes the brand link 237px and lets the divider follow it.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqKop` | https://identity.conduction.nl/screens/board?id=dossiq/DqKop |
| `dossiq/DqZaken` | https://identity.conduction.nl/screens/board?id=dossiq/DqZaken |
| `pipelinq/PqLeads` | https://identity.conduction.nl/screens/board?id=pipelinq/PqLeads |

## Out of scope

- The layout of the rest of the bar (centred search, bell, contacts, the
  person): thematiq's workplace header style draws it.
- The apps' own lines: each app declares `nav.searchPlaceholder` in its
  manifest.

## Impact

Additive. One optional manifest key, one renderless component. Without the
board look, without the key or without `#header` nothing changes. The brand
block grows from 237px to 250px under the board look.
