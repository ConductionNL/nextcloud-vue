# The mail card's header buttons are 40px

## Why

DqZaakEmail draws "Mail koppelen" and "Mail opstellen" at the board's 40px control height; live NcButtons are 34 (r31 verdict: h 40>34; probed on :8080).

## What changes

- Board look: buttons in `.cn-mail-tab__header-actions` take `--cn-board-control-height`.
