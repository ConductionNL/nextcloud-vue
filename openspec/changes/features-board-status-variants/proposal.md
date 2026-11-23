# Proposal: features-board-status-variants

## Why

DqFunctionaliteiten draws a planned feature ("Gepland, 2027") as a neutral pill; the features board always drew planned
purple. The PqRoadmap board keeps the library's tones, so the tone is a page choice.

## What changes

CnFeaturesBoard takes `statusVariants` (manifest `config.board.statusVariants`), CnStatusBadge variants by status key.
A status the page does not name keeps the library's tone.

## Reach

Roadmap pages that set `board.statusVariants`. No schema change.
