---
kind: code
---

# Proposal: board-index-row-gap-and-cell-buttons

## Summary

Two index list differences that every dossiq list board shows (r31 audit):

1. The search row sits 20px under the views row on the boards (DqZaken,
   DqPostvak, DqContracten, DqTaken, DqContacten, DqOrganisaties,
   DqZaaktypen, DqWerkbord, DqZakenKaart); live drew it 8px under, so the
   table and the pager sat 12px high.
2. A row's action buttons ("Aan zaak koppelen", "Nieuwe zaak" on DqPostvak)
   are 34px on the board; live drew NcButton's small 24px button.

3. The header's count line ran at a 1.5 line height with nothing under it
   (72.5px headers against the boards' 76 on 20 list boards).

CSS in the board look only. The Nextcloud look is unchanged.
