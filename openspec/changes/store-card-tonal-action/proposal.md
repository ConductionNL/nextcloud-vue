# Proposal: store-card-tonal-action

## Why

PqStore draws Install and Update on a store card as the light-blue tonal pill, and the chosen lens chip ("Alle 9")
without an edge. Live the pills read white with ink text and the chip keeps a 1px edge (pl5: PqStore 11-17). The soft
pill rule read `--color-primary-element-light`, which the board look redefines inside every secondary NcButton as the
main background, so the tint never reached the button.

## What changes

The soft card action reads the tint the body hands down (`--cn-tonal-bg`, `--cn-tonal-ink`, as `cn-button--tonal`
does), on the button and its text. The chosen lens chip draws without a border.

## Scope

Board-only, `look-board-index.css`. No schema change.
