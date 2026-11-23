---
kind: code
---

# Proposal: list-add-in-panel-heading

## Summary

Board PqTicketContactmomenten draws the Contact moments tab as a card with a title row: "Contactmomenten", the line "2 bij dit ticket, nieuwste eerst" under it and an outlined "Contact vastleggen" button beside it. Live draws no title row and puts the list's Add as a wide tertiary button below the rows.

CnObjectListWidget learns `content.addPlacement: "header"`, as CnFieldListWidget has its add placements: the Add (with `content.addIcon`) goes to the card's title row as an outlined button and is no longer drawn below the rows or in the empty state. A list already reports its counts line (`content.headerSubtitle`) through its `header` event. In a tab panel the widget host is bare and drew neither, so the bare host now hands the report on (`panel-header`), and a single-widget tab with `showTitle: true` draws it in its panel heading, even when the title repeats the tab label.

## Scope

- `CnObjectListWidget`: `addPlacement`, `addIcon`, the Add in the `header` report.
- `CnDetailWidgetHost`: bare chrome forwards the renderer's header report as `panel-header`.
- `CnTabsWidget`: a showTitle panel heading draws the reported subtitle and actions.
- No schema change (widget `content` is free-form).
