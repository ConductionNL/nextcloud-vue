# Proposal: board-widget-action-button-height

## Why

The boards draw a widget's own labelled action buttons at the 40px control height. NcButton draws 34px. COMPDIFF r23
`h 40>34`: "Exporteren" (DqZaakHistorie, CnTimelineManage header), "Bestanden toevoegen" (DqZaakDocumenten,
DqZaakDocumentenSlepen, CnFilesBrowser bar), "Toevoegen" (DqZaakTaken, the widget empty state), "Nominatie
herberekenen" (DqZaakArchivering, the retention card head).

## What changes

In the board look these buttons take `--button-size: var(--cn-board-control-height)`. In the files bar only labelled
buttons do; its menu triggers and icon-only buttons keep their size.

## Scope

Board-only, `look-board.css`. No schema change.
