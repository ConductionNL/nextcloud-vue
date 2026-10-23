# Proposal: files-browser-column-hidden-by-default

## Why

dossiq's case Files tab replaced its Documents tab, which showed each document's direction and keywords and filtered
on keywords (documents-on-the-case). The board draws the Files tab without those columns, and users keep features: a
column the board leaves out belongs behind a disclosure, not gone. CnFilesBrowser's Columns chooser is that disclosure,
but a declared column always started visible.

## What changes

A declared column may say `hidden: true`. While a user has made no choice it is left out of the table; it is in the
Columns chooser, still groups and filters (`groupBy`, `facets`), and shows once the user ticks it. A stored choice decides
as before. No schema change.
