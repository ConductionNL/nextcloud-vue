# Proposal: grouped-cards-actions

## Why

DqZaaktype's "Fasen en taken" card has a row of buttons under its subtitle, above the phases: "Bekijken als flow" and
"Taak toevoegen". A grouped-cards widget has an action per group, and the card header a link, but no row above the groups.

## What changes

`content.actions` draws a row of actions (as CnActionButtons draws them) above the groups, also while there are no groups.

## Scope

nextcloud-vue only. Widget content is not validated per key: no schema change. dossiq uses it on the case type page
(DQ-ADMIN).
