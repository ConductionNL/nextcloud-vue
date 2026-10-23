# Proposal: relative-ago-formatter

## Why

DqMijnWerk's Verder werken says when the reader last opened each case the way people say it: "10 min geleden",
"vanochtend", "vrijdag". The library's `relative` and `relativetime` formats read "vandaag, 00.05" and "gisteren",
which is right for a date column but not for "how long ago".

## What changes

A row template may format a moment with `{path|ago}`: "zojuist" under a minute, "{n} min geleden" under an hour,
"{n} uur geleden" under three hours, then "vanochtend", "vanmiddag" or "vanavond" for the rest of today, "gisteren",
the weekday for the five days before that ("vrijdag"), and the board's short date ("14 sep") after that. A moment in
the future reads as the existing relative date.

## Scope

`utils/boardDate.js` (`formatAgo`), `utils/fillTemplate.js` (`ago`), the library catalogue (en, nl). No schema change.
