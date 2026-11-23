# Proposal: user-name-formatter

## Why

r29 (25 Oct): DqWerkbord's card owners read "P" on :8080 (the initial of the user id "pieter") where the board draws "PJ" (Pieter Jansen). A board card's owner, and any other field holding a Nextcloud user id, had no built-in way to read as the user's display name.

## What changes

A built-in formatter `userName`: a user id as its display name through the existing cached lookup (`userDisplayName`), the id while it loads and for a user nobody answers for. Apps name it where a field holds a user id (CnBoardView card `formatters`, columns, templates). No schema change.
