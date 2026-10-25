# Proposal: search-linked-user-and-widths

## Why

DqZoekresultaten on :8080 (24 Oct, r25b): the Gekoppeld cell of a case read the handler's uid ("admin"), the board
"Pieter Jansen"; the Resultaat column cut every title at about 140px, the board gives it about 250.

## What changes

- A search kind's `linkedUser: true` reads the Linked value as a user id and shows the user's display name.
- `sourceConfig.columnWidths` sets a width per column key (title, kindText/kindLabel, linked, status).
