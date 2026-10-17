# Proposal: countdown-board-look

## Why

Board DqZaak draws a "Termijn" card in the side column: the title, "27 dagen", "Beslissen uiterlijk 1 november 2026", a
thin bar of the time passed and a "Termijn opschorten" button, with no icon. CnCountdownWidget drew an icon circle,
"27 days left" and the bare date, and had no bar and no action.

## What changes

- CnCountdownWidget takes `daysLabel`, `caption`, `startField` and `action` in its content.
- In the board look it draws no icon circle, and the headline takes the text colour until a threshold applies.
- Without the new keys and outside the board look nothing changes.
