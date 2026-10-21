# Proposal: board-card-header-button-height

## Why

The boards draw a labelled button beside a card's title at the 40px board control height. NcButton draws 34px.
COMPDIFF r20: "Nieuwe taak" (DqZaakTaken), "Deelzaak aanmaken" (DqZaakGerelateerd), "CSV exporteren" (DqTermijnen),
"Nominatie herberekenen" (DqZaakArchivering), "Notitie toevoegen" and others, `h 40>34` on about 20 card buttons.

## What changes

In the board look a labelled button in a widget card's header actions takes `--button-size: var(--cn-board-control-height)`.
Menu triggers ("Acties") and icon-only buttons keep their size, as the boards draw them.

## Scope

Board-only, `look-board.css`. The card header's layout (gaps, insets, action count) is not touched.
