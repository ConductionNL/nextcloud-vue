# Proposal: board-plain-title-secondary-normal-leading

## Why

PqTaken (BOARD-R2 residue): row 66.5 vs the board's 64. The 13px secondary line under a `rowTitle: "plain"` title ran at the table's 1.35 (17.55px); the boards draw it at normal leading, as the Dq two-line title cells (DqZaakTaken, DqZaakDocumenten, DqZaakDocumentenSlepen) do.

## What changes

In the board look the plain title's secondary line takes line-height normal. Dossiq never sets `rowTitle: "plain"` (its manifest uses `text` only), and its two-line cells are the tasks widget and the files browser, which set their own normal leading. Probed on :8080 with compdiff `--inject-css`: PqTaken row 66.5 -> 64 = board (flagged 1 -> 0); DqZaakTaken, DqZaakDocumenten, DqZaakDocumentenSlepen, DqTaken move 0.0; PqZRapporten, PtAccounts, PtInzendingen 0.0; PqProducten and PtPortals keep their row height (63), only rows with a secondary line get shorter.
