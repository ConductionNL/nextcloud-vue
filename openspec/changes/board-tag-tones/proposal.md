# Proposal: board-tag-tones

## Why

COMPDIFF r32 (dossiq settings boards): the boards draw a toned tag as the theme's status badge pair, for example
"Actief" and "Ongewijzigd" #1E6B2A on #E7F3EA. Live the success tag was #005416 on a translucent mix. The base badge
reads the hue tokens (`--nl-color-green-light`), which the zuiddrecht theme does not set, so it fell through to
Nextcloud's 15% mix. The theme sets `--nldesign-component-status-badge-<tone>-background-color` and `-color` for
exactly this component.

## What changes

- In the board look a non-solid success, warning, error or info CnStatusBadge reads the theme's status badge ground
  and ink first, then the hue tokens, then Nextcloud's.

## Scope

nextcloud-vue `src/css/look-board.css` only. The Nextcloud look is unchanged.
