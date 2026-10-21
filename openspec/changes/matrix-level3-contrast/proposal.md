# Proposal: matrix-level3-contrast

## Why

A matrix chart's level 3 cell is the primary colour at 65% over the main background with white text. Under Nextcloud's
default light tokens that is about 2.9:1, below WCAG 2.2 AA's 4.5:1 for 14px text. Every theme showed it this way
except thematiq, which only masked it by forcing the body ink onto spans.

## What changes

The light levels take a dark ink: level 3 now uses the main text colour (and hands it to
`--nldesign-color-on-surface`), as level 2 does. White stays only on level 4, the full primary, where Nextcloud's
primary text colour reaches 4.5:1.

Builds on `board-matrix-cells`.
