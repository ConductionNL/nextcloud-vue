# Proposal: board-close-day-pair-as-drawn

## Why

COMPDIFF r33, DqDagAfsluiten: the gap between "Annuleren" and "Dag afsluiten" was 517px against 512.8. Annuleren carried
NcButton's 4px text padding on each side (4px wider than drawn), Dag afsluiten had 14px padding and a 16px icon where the
board has 16px and 18px (6px narrower), and the pair sat 23px from the card edge against 24.

## What changes

In the board look, the closing pair of a note list: Annuleren 14px in without inner text padding, Dag afsluiten 16px in
with an 18px icon, the line 1px further in.
