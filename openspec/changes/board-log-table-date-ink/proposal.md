# A plain log's date reads in the main ink

## Why

In a plain log (rowTitle text) the title column is an ordinary cell in the main ink, but a date widget in it kept the link colour: DqZaakContact's contact moments read "14 okt, 09:15" in primary where the board draws it in the main ink (r32 cell colour; probed on :8080, TIME.cn-cell-renderer__date 54,105,165).

## What changes

- Board look: in a plain-log table the date widget in the title column takes the main ink.
