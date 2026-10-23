# Proposal: files-card-header-actions

## Why

Board OcBijlageToevoegen (opencatalogi) draws "Add attachment" in the header of
a publication's Attachments card. CnFilesCard renders a CnDetailCard, whose
header has an `#actions` slot, and does not pass it through, so an app has to
place its button over the card with CSS.

## What changes

- CnFilesCard passes an `#actions` slot to its CnDetailCard header, scoped
  with `{ refresh }`, the card's own file fetch, so the host can show a file it
  just added. Without the slot nothing changes.
