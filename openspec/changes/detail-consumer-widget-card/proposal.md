# Proposal: detail-consumer-widget-card

## Why

On a card surface of a detail page (the side column, a tab stack), only catalog content-only types and `card: true`
types got the titled card. An app's own widget, such as dossiq's location map, case plan panel or work instruction
(boards DqZaak Locaties / Zaakplan), rendered bare: no card, no title.

## What changes

- CnDetailWidgetHost wraps an app's own widget (a `cnRegistry` entry) in the titled card on a card surface, like a
  catalog widget (the widget definition's title and icon, no Actions menu), when its registry entry asks for it with
  `chrome: "card"`.
- Opt-in: a fleet scan found 20 placements of app widgets on card surfaces (pipelinq 10, portaliq 10), most of them
  drawing their own card (pipelinq's `sectionWidget(..., { card: true })`, portaliq's summary and KPI cards). Wrapping
  by default would have doubled those cards. Without `chrome: "card"` nothing changes.
- A body grid cell draws its own card, so CnDetailPage marks it (`inGridCell`) and an app's widget there stays bare, as
  before. Bare chrome (a single-tab panel) is unchanged.
