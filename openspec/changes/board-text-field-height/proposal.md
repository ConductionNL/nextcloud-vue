# Proposal: board-text-field-height

## Why

The boards draw every text field 40px tall. The board look set 40px on the dialogs, the settings cards and (in
board-text-field-control) the index side panel only; an NcTextField anywhere else drew NcInputField's 30px in a 34px
wrapper (portaliq's sign-in settings "Startadres", "Consumer-id", "Uitwisselingsadres": COMPDIFF pq3 `h 40>30`).

## What changes

In the board look every NcTextField (an `.input-field` outside a select) is `--cn-field-height` (40px) tall, its wrapper
that plus the 2px focus ring. The side panel's own rule goes, the general one covers it. Plain Nextcloud is unchanged.

## Scope

Board-only, `look-board.css`. Stacked on board-text-field-control (and so on board-select-control). Selects keep their
own heights.
