# Proposal: field-list-add-in-card-title

## Why

Board DqZaaktype draws "Variant toevoegen" in the Varianten card's title row. The field list can put its add button
above the rows (`add.placement: "header"`) or below them, but always inside the card body (COMPDIFF r24: Varianten
`header.actions 1>0`). A widget already reports title-row actions to the detail host through its `header` event
(CnEventsCard, CnTasksWidget); the field list did not.

## What changes

`add.placement: "title"` makes `CnFieldListWidget` report its add button (label, Plus icon) on the `header` event, so
the card draws it in the title row; the button toggles the add form, which opens above the rows. No button is drawn
in the body then. `header` and `footer` are unchanged.

## Reach

Opt in per widget. No schema change (the field list's content is open); docs in `cn-field-list-widget.md`.
