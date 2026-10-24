# Proposal: record-list-due-below

## Why

DqDagAfsluiten's "Morgen eerst" draws each item's deadline as a short line under its title ("3 dagen te laat", 13px,
bold, in the error ink), not at the end of the row. In the narrow side column a deadline at the end of the row wrapped
under the title at the far right.

## What changes

A rows record list with `duePlacement: "below"` draws the due text as a line under the title (and meta), at 13px and
in its tone, instead of at the end of the row. Without it nothing changes.

## Scope

CnRecordListWidget (rows presentation). No schema change.
