# Proposal: board-detail-card-header-button-height

## Why

The boards draw a labelled button beside a card's title at 40px. board-card-header-button-height covers a widget
card (CnWidgetWrapper); a CnDetailCard's header (CnNotesCard, a detail card's declared header actions) still draws
NcButton's 34px. COMPDIFF r23 DqTaak "Notitie toevoegen" `h 40>34` (the notes card's composer button).

## What changes

In the board look a labelled button in `.cn-detail-card__header-right` takes the control height. Menu triggers and
icon-only buttons keep their size.

## Scope

Board-only, `look-board.css`. No schema change.
