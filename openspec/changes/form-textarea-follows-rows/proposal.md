# Proposal: form-textarea-follows-rows

## Why

pl8 on board PqTicketBewerken (1 Nov): "Bericht aan de klant" asks for two rows (`rows: 2`) and is drawn two lines
high, but the board look sizes every form text area three lines tall (`calc(3 * 1.2em + 22px)`), so it measured 76px.
Probed on :8080: with the rows handed to the stylesheet it measures 58px, and the three-row "Omschrijving" stays 76px.

## What changes

- CnFormDialog hands a textarea field's own `rows` to the board look as `--cn-textarea-rows`.
- The board look sizes a form text area by `--cn-textarea-rows`, three lines when it is not set.

## Reach

Board look, a form text area whose field override sets `rows`. A text area without its own rows keeps its 76px.
