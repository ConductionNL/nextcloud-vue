# Proposal: board-split-pane-side-column

## Why

pl5 on board PqKassaAudit: the board draws the open audit record as a 360px card in the page's side column, starting
at the top of the chips and the toolbar, with the list column (chips, toolbar, search, table) 740px beside it. Live put
the split pane beside the table only, under a toolbar that spanned the whole page, so the list kept a 1120px toolbar
and the record started 140px lower.

## What changes

- In the board look, an open split view (`splitLayout === 'split'`) makes the pane the page's side column: CnIndexPage
  adds `cn-index-page--split-side` and the page takes the side panel's grid (header rows across, chips, toolbar and
  list in the first column, the pane in the second, from the chips' top).
- The column is the pane's declared width (`splitView.paneWidth`, via `--cn-index-split-pane-width`); the pane draws no
  inline width there.
- The pane is a board card: 1px edge, 12px radius, 22px in, white ground. Inside it the detail page brings no inset,
  its title is 17px, and its widgets are unframed sections of the card.
- A page with a side panel or a folder pane, the Nextcloud look, and the narrow full-page layout keep the pane in the
  body as before.
