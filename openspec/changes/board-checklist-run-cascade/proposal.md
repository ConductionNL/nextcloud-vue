# Proposal: board-checklist-run-cascade

## Why

DqInspectie r36: the question cards start 10px low (368.5 vs 358.5) and are 267 tall (253 drawn), so the second card is 24px low. The widget's own board measures lost the cascade on :8080: a theme sets every label's weight with !important (options read bold), the board look's (0,4,1) radio rule draws 18px radios over the widget's 20px, the note label and the position line run at the body's 22.5px leading, and Nextcloud gives the note a 3px margin.

## What changes

Options keep 400 with !important and are 23px high (31px apart); the radio rule outranks the board look's; the note label runs at 1.2, the note has no margin; the position line is 13px on a 17px line and the group runs at normal leading. Probed on :8080 with the rules injected: bar 312 (board 312), cards 359/253.6 and 624.6/187.6 (board 358.5/253, 623.5/188), radios 433.6/464.6/495.6 (board 433.5/464.5/495.5), note 545.6 (board 544.5).
