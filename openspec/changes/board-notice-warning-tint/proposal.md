# Proposal: board-notice-warning-tint

## Why

The board notice ("Advies gevraagd" on 12 Dq case boards) sits on #FFF4DE on all 13 boards that draw a warning
notice. Live drew #fdf1d6: the ground read `--color-warning-light`, a variable Nextcloud 34 does not have, so it always
fell to the library's own fallback.

## What changes

`--cn-board-notice-bg` reads the theme's warning tint `--nl-color-orange-light` (the ground a warning pill takes),
falling back to #fff4de. The ink keeps `--color-warning-text`.

A record list's warning notice (DqZaaktypeOverzicht "Controle") had the same dead variable in its ground and fell to
rgba(255, 196, 0, 0.12); under the board look it takes the same tint.

## Reach

Board-look notices and record-list warning notices. No props, no schema change.
