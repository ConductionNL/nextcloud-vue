# The files second line shows the file's date

## Why

`secondLine: ["type", "size", "modified|date"]` left the date out: the file
node carries `mtime` as a Date, and a template drops object values, so
DqZaakDocumenten read "PDF · < 1 KB" where the board draws
"PDF · 1,2 MB · 14 januari 2026".

## What changes

- CnFilesBrowser hands `modified` to the second line as ISO text, so every
  date format (`date`, `longdate`, ...) fills it.
