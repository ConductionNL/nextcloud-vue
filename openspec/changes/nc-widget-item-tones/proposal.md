# Proposal: nc-widget-item-tones

## Why

DqMijnWerk's Recente activiteit colours each activity's dot by what happened: a reaction blue, a publication green, a
handover grey. The board look drew every dot in the primary colour. Nextcloud's dashboard widget items carry no
activity type, but the activity app sets each item's icon from the activity's app (`/apps/comments/…`,
`/apps/files/…`), and an item may carry its own `app`, `type` or `objectType`.

## What changes

`content.itemTones` (`{ "<app or type>": "success" | "info" | "neutral" | "warning" | "error" }`) gives an item the tone
of the first key it matches, by the same kinds `excludeApps` / `excludeTypes` read: the item's own `type`,
`objectType` and `app`, else the app in an `/apps/<app>/` part of its link or icons. The item carries
`cn-nc-widget-widget__item--tone-<tone>`; in the board look the dot takes that tone's colour. An item without a match
keeps the primary dot.

## Scope

CnNcWidgetWidget (one helper for exclusions and tones), look-board.css. No schema change.
