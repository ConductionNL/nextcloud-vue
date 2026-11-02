# Proposal: board-party-rows-as-drawn

## Why

r43 (DqZaakBetrokkenen, case 2026-0110, after the case schema's role vocabulary was fixed on :8080): the Partijen card was 645 high where the board draws 633, and the Rollen rows were 69 and 88.5 high where the board draws 60 and 75.

- Partijen: each role heading was one 22.5px line (line height 1.5) with a 6px top margin, groups stood 8px apart and the last group kept an 8px margin inside the card. The board draws an 18px heading, 14px under the previous row.
- Rollen: the name and the meta line took Nextcloud's 1.5 leading where the board draws normal leading, and the widget's scoped 12px gap beat the board look's 8px (same specificity, loaded later), so the rows stood 12px under the accepted kinds strip and each role group 12px below the previous one. The board draws one list of touching rows, 8px under the strip.

## What changes

In the board look only: the contacts tab's role heading at line height 1.2 without a margin, its groups 14px apart and the last one flush; the parties widget's name and meta at normal leading, the board gap of 8px with the root class named twice, and each role group pulled up by that gap so the rows touch. No schema change.
