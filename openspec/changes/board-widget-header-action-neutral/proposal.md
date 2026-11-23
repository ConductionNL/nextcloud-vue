# Proposal: board-widget-header-action-neutral

## Why

A widget can report actions for its card's title row (CnDetailWidgetHeaderItems). The non-primary action is a
`<button class="cn-detail-page__catalog-action">`, but its style sat in CnDetailWidgetHost's scoped block, so it never
reached the button: live it falls back to Nextcloud's bare button (15px, 8px 12px padding, about 50px tall on
DqZaakBesluiten "Document genereren"). COMPDIFF r22: `border 1>0` and `h 40>50` on that button; the boards draw a
neutral 40px control.

## What changes

- The action's own style moves into CnDetailWidgetHeaderItems, the component that renders it (every look).
- In the board look, a header action outside the side column is a neutral 40px control: main background, the
  control border, main text at 14px/600. The side column keeps the tinted "+ Toevoegen".

## Scope

CnDetailWidgetHeaderItems.vue, CnDetailWidgetHost.vue (style moved out), look-board-detail.css. No schema change.
