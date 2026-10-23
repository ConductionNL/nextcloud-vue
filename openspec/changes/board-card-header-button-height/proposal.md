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

## Revised (23 October 2026, COMPDIFF r24)

The current boards draw a card's title-row buttons at 34px:

- DqZaaktype: "Taak toevoegen", "Bewerken"
- DqZaaktypeOverzicht: "Regel toevoegen"
- DqCatalogus: "Objecttype toevoegen"
- the Termijnen, Statussen, Regels, "Wat hierna komt" and Velden cards

At 40px these buttons put the title 27.5px from the card's top, against 30.5px
on the boards. The rule now sets `--button-size: 34px`.

The 40px buttons named in the Why section are not in a card's title row. They
sit in the card body: an empty state, the files bar, the timeline head, the
retention head. DQ-PILLS' `board-widget-action-button-height` sizes those.
