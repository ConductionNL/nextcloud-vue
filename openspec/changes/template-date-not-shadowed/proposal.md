# Proposal: template-date-not-shadowed

## Why

CnAppRoot gives every page the library's built-in formatters with the app's own on top. fillTemplate looked a format
name up in those formatters first, so `{deadline|date}` found the built-in `date` (dateStyle medium, "28 okt 2026")
before the template's own board date ("28 okt"). Board DqZakenKaart writes the list dates without the current year.

## What changes

The library's built-in `date` and `datetime` formatters no longer shadow the template's formats of the same name. An
app's own formatter of that name still wins.
