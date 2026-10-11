---
kind: code
depends_on: [screens-index-list-parity]
---

# Proposal: screens-index-toolbar-parity

## Summary

The app lanes compared DqZaken, PqTickets, PqLeads and PtPortals with the live
index pages and found row 1 of the board toolbar still off:

1. dossiq gap 3: "Weergave opslaan" is an outlined English "Save view" and not
   at the end of the chip row.
2. dossiq gap 4: the view switch wraps on its own to the next line, leaving
   Filter alone at the far right of row 1. The board keeps Filter and the
   switch together.
3. dossiq gap 5: the search placeholder has no manifest key, so every list
   reads "Zoeken...". The board reads "Zoek op zaak, nummer of verzoeker".

This change makes Filter and the view switch one unit that wraps as one, makes
Save view the board's ghost button, adds the toolbar's missing Dutch strings
to the library catalogue, and adds `config.searchPlaceholder` to the manifest
schema, run through the app's translate.

## Reference screens

| Screen | Live board |
|---|---|
| `dossiq/DqZaken` (Save view, Filter + switch wrapped to line 2) | https://identity.conduction.nl/screens/board?id=dossiq/DqZaken |
| `pipelinq/PqTickets`, `pipelinq/PqLeads` (Filter + switch at the end of row 1) | https://identity.conduction.nl/screens/board?id=pipelinq/PqTickets |
| `portaliq/PtPortals` | https://identity.conduction.nl/screens/board?id=portaliq/PtPortals |

## Out of scope

- The download icon dossiq saw in the toolbar is the Export menu. It already
  leaves the toolbar when the page declares an `export` header button
  (`zuiddrecht-pixel-gaps-3`); dossiq declares `headerButtons`.
- The active filter line and the view switch segments: their own changes.

## Impact

Additive. One manifest key (`searchPlaceholder`, schema 2.78.0), one wrapper
element in the board toolbar, CSS under `.cn-look-board`, catalogue entries.
Without the board look nothing changes apart from the translated placeholder.
