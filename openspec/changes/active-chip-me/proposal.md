# Proposal: active-chip-me

## Why

DqFilterInMenu on :8080 (24 Oct, r25b): the view "Termijn deze week" (assignee @me) put "Toegewezen aan: pieter" on the
Active line; the board draws "Behandelaar: ik".

## What changes

On a filter over a `nextcloud-user` property, the reader's own uid reads "me" ("ik"). A `filterLabels` value still wins.
