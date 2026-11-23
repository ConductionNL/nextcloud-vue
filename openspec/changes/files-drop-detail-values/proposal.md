# The drop detail line can name the record

## Why

DqZaakDocumentenSlepen writes "3 bestanden komen bij zaak 2026-0082, als nog
te beoordelen document." under "Laat los om toe te voegen". `dropDetail` could
only fill `{count}`; a detail page's props resolve a whole value such as
`@object.identifier`, not a token inside a sentence.

## What changes

CnFilesBrowser `dropDetailValues`: named values filled into `dropDetail` as
`{name}` (a detail page passes `{ "case": "@object.identifier" }`). While a
value is unknown (empty, or a token not yet resolved) the line is left out.
CnFilesTab forwards it.
