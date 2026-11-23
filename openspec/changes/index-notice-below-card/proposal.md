# Proposal: index-notice-below-card

## Why

DqContracten draws its notice ("Verlengen en opzeggen zijn besluiten ...") under the list card, on the page ground. The
index page draws `config.notice` inside the list, under the rows, so under the board look it sits inside the card.

## What changes

`notice.placement: 'page'` draws the notice after the list body, under the card, 20px below it. Without a placement
the notice stays where it is.

## Scope

nextcloud-vue only. `config.notice` is an open object in the manifest schema: no schema change. dossiq sets it on the
Contracts page (DQ-ADMIN).
