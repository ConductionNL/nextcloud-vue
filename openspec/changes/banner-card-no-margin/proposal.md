# Proposal: banner-card-no-margin

## Why

COMPDIFF r33, DqDashboard: the info line "Binnen termijn ziet alleen wie controleert of beheert." stood 15px under its
grid cell. `CnBannerWidget` set `margin: 0` on its note card, but NcNoteCard's own `.notecard` margin (15px above and
below) is as strong and loads later, so it won; the cell also grew 30px.

## What changes

The banner widget's note card draws no margin of its own (its rule doubles the class to win over NcNoteCard's).
