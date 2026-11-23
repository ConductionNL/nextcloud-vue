# Proposal: board-save-view-only-when-changed

## Why

DqTeamwachtrij and DqWerkbord draw no "Weergave opslaan" on an untouched view; DqZaken draws it once two filters are
set. Live drew it always, and on the team queue it took the room the case type chips needed (they folded into "...").
Coordinator decision (24 Oct): Save view appears only when the view has changed.

## What changes

CnIndexPage tracks whether the reader changed the view: a filter, an Active-line chip, "Clear all", the search, the
order, the columns (set, order, pins), a quick filter, the board's narrowing or column field. Opening a saved view or
saving one resets it. In the board look the toolbar's Save view shows only while it is set. The Nextcloud look keeps
the button; the side panel's Views tab keeps saving. No schema change.
