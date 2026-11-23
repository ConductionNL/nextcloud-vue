# Proposal: index-named-source-export

## Why

The boards draw "Downloaden" on lists whose rows come from a named or endpoint source (DqTaken, DqPostvak,
DqZoekresultaten). Those pages declare an Export header button, but the library drew it only with a `run` or a
`@mass-export` listener, because such a source has no OpenRegister export behind it. So the button was missing
(COMPDIFF r19: button "Downloaden" missing on live on three boards).

## What changes

An index page on a named or endpoint source draws its declared Export button. Without a `run` or a listener, it
downloads the rows the source holds for the current query as a CSV file: one column per table column, headed by its
label, with RFC 4180 quoting, a UTF-8 byte order mark, and a leading `=`, `+`, `-` or `@` neutralised so a spreadsheet
does not evaluate a cell.
