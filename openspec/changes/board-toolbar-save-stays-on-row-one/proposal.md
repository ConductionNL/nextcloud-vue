# Proposal: board-toolbar-save-stays-on-row-one

## Why

DqZaken draws the quick-filter chips and "Weergave opslaan" on row 1, and starts row 2 with Filter and the view switch.
Live (probed on :8080, 23 Oct) the chips plus their "Nog 15 filters" button took 967px of the 1120px bar, so Save view
no longer fit; it wrapped to row 2 and, through its auto margin, pulled Filter and the view switch to the right end of
that row. A wider count ("296" where the board reads "48") is enough to tip it.

## What changes

In the board look, with the chips in the actions bar (not `quickFilterPlacement: "toolbar"`), the chip bar may take the
row less room for Save view (`--cn-board-save-view-room`, 170px) and wraps its own chips inside that width, so Save
view stays on row 1, at the top, and Filter with the view switch starts row 2. No schema change.
