# Proposal: board-events-card-under-subtitle

## Why

r36 (DQ-L7, nc-vue 2.163.0) still measured DqTaak "Afspraken" with its first appointment 44.8 under the title against the board's 41. board-card-rhythm-r34 starts an appointments card 8px under its header, but "Afspraken" has a subtitle ("Uit de agenda, gekoppeld aan deze taak"), and the rule that starts every subtitled main-column card 12px under its header is more specific, so live kept 12px.

## What changes

Board-look CSS only, in `src/css/look-board-detail.css`: the appointments rule also names the subtitled card, so it outweighs the 12px rule. No schema change.
