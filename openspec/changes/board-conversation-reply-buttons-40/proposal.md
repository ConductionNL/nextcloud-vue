# The reply box's buttons are the board's 40px control

## Why

The boards draw labelled buttons at the 40px control height (DqBerichtVersturen "Versturen"). The conversation reply box's "Opslaan als concept" and "Versturen" are NcButtons at 34 (DqZaakContact r29: 34 vs the board's 38, which the board redraws at 40).

## What changes

- Board look: buttons in `.cn-conversation-thread__reply` take `--cn-board-control-height`.
