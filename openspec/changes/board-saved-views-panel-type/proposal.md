# Proposal: board-saved-views-panel-type

## Why

On :8080 (24 Oct, r25b) the saved-views panel drew its group headings ("Mijn weergaven") at 13px, its notes at 15px in
the main ink and each view's description semibold. Board DqFilterBeheren draws the heading at 15px/700, and the notes
and descriptions at 13px in the muted ink. The Dutch group name read "Met mij gedeeld" where the share dialog and the
board say "Gedeeld met mij".

## What changes

Board-look rules for the panel's section heading, note and description line; nl "Shared with me" = "Gedeeld met mij".
