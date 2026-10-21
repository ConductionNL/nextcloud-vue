# Proposal: board-matrix-tones

## Why

DqProcesanalyse "Dagen per fase" draws its matrix in four tones: #eaf0f7, #b9cde3, #6f95c4 and #234a78 under the
Zuiddrecht set. The library drew levels 2 and 3 lighter (the primary at 30% and 65%) and level 4 in the brighter
primary (#3669a5), so a cell at the same level never matched the board (COMPDIFF r20: background rgb(185, 205, 227)
on six cells).

## What changes

Level 2 mixes the primary at 35% and level 3 at 70% over the main background. Level 4 inverts level 1: the light
primary text as the ground and the light primary as the ink, which is the board's deep primary under the Zuiddrecht
set and stays the strongest tone in Nextcloud's light and dark themes.

The board draws level 3 with white text, about 3.1:1 on #6f95c4, which fails WCAG AA for 14px text. Level 3 keeps its
dark ink; 70% is as deep as that ink stays at 4.5:1 in Nextcloud's dark theme.
