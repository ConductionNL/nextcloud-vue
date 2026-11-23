# Proposal: detail-actions-per-tab

## Why

DqZaak draws the "what now" card and three quick actions above the body. On the AI-toezicht tab (DqZaakAssistent) the
board drops the card and keeps one quick action, "Bericht". Side cards can already follow the open tab with `tabs` and
`notTabs`; the card and the quick actions could not, so they stayed on every tab.

## What changes

- `nextStep` takes `tabs` and `notTabs`, read as a side card reads them.
- A quick action may be written `{ id, tabs?, notTabs? }`: the id of a declared header action that shows as a button
  only beside those tabs. On another tab it is back in the Actions menu, so it stays reachable.
- The tab rule moves into one helper, `onTab`, which the side column uses too.

## Scope

Additive. A page that names no tabs renders as before. Schema 2.141.0.
