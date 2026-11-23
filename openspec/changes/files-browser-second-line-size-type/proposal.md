# Proposal: files-browser-second-line-size-type

## Why

The DqZaakDocumenten board draws each document as two lines: the name, then "PDF · 1,2 MB · 14 januari 2026". COMPDIFF
r21 measured the live rows at 34px against 63. CnFilesBrowser already has a two-line row (`nameSecondary`), but its
template could only read the row data, the name, the change date and the owner, so a manifest could not write the
board's line.

## What changes

`nameSecondary` also reads `size` (formatted, as the size column shows it) and `type`, the file's type as a reader
names it: "PDF", "Word", "Excel", "PowerPoint", "Email" or "Image" for common types, else the extension in capitals.
DqZaakDocumenten then sets `"nameSecondary": "{type} · {size} · {modified|date}"` (dossiq manifest, R22-RECORD).
