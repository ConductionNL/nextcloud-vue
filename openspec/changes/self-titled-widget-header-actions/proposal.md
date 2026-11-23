# Proposal: self-titled-widget-header-actions

## Why

pl4 on board PqKlant: the Activiteit card draws "E-mail koppelen" and "Opstellen in Mail" in its title row, beside
"Activiteit". Live drew them in a row of their own above the title. The timeline draws its own title (registry
`ownsTitle`), so on a card surface it stands in an untitled card, and that card drew the widget's `headerActions` in a
header with no title in it.

## What changes

- A self-titled widget that declares a `headerActions` prop gets the resolved manifest `headerActions` from
  CnDetailWidgetHost and draws them in its own title row. The card around it then draws none.
- CnTimelineWidget takes `headerActions` and draws them beside its title.
- A self-titled widget without the prop keeps today's behaviour: the card draws the actions in its header.
