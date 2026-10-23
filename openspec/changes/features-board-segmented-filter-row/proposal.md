# Proposal: features-board-segmented-filter-row

## Why

DqFunctionaliteiten draws the status filter (Alles, Stabiel, Beta, Gepland) as a grey track across the whole content
row with the options at its start. The features board drew the track only around its options.

## What changes

`CnFeaturesBoard`'s segmented filter stretches across the row; its options stay at the start. The chips filter is
unchanged.

## Reach

Roadmap pages with `board.filter: "segmented"`. No prop or schema change.
