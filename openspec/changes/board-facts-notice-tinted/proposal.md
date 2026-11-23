# Proposal: board-facts-notice-tinted

## Why

PqKassadienst draws the cash difference card's "Buiten de marge." notice as a tinted rounded box: the light red ground, the text and the outline icon in the error ink, radius 8, 10px 14px of padding, no edge bar. In the board look a facts card's notice is NcNoteCard with its 4px left bar at radius 4 and the body ink. COMPDIFF pl4 PqKassadienst 8: `border.left 0>4, borderRadius 8>4`. The board's general info note rule already drops the bar, but only for `info`.

## What changes

In the board look a facts card's `error`, `warning` or `success` notice is a tinted box in its tone: the ground and ink come from the board tokens (`--cn-board-red-tag-ground` with `--color-error-text`, `--cn-board-notice-bg` with `--cn-board-notice-ink`, `--cn-board-success-tint` with `--cn-board-success-ink`), no edge bar, radius 8, 10px 14px, 14px text at 1.45, an 18px icon on the first line. The info note keeps the general rule.

## Scope

Board-only, `look-board-detail.css`, scoped to `.cn-facts-widget__notice`. Banner widgets and side notices keep their own rules. No schema change.
