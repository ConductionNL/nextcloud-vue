# The files table's checkbox column is 42px

## Why

DqZaakDocumenten and DqDocumentenBeheer draw the checkbox cell 12px either side of the 18px box (42px). CnFilesBrowser sets 36px, so the file icon and name start 6px left of the board (r31 DqZaakDocumenten text inset 96 vs 100).

## What changes

- Board look: `.cn-files-browser__col-select` is 42px wide. Probed on :8080 with the rule injected: checkbox 12, icon 54 (board 54), name 102 (board 100, in tolerance).
