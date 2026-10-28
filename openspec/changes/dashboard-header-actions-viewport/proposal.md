# Proposal: dashboard-header-actions-viewport

## Why

pl3 PqMobiel measured My work at 375px: the header showed Downloaden and the buildiq square, where the board's phone header holds only the title. The widgets already pick a viewport (dashboard-widget-viewport); the header actions could not.

## What changes

- CnDashboardPage `headerActionsViewport` (manifest `config.headerActionsViewport`): `wide` keeps the header actions and the buildiq square off a phone (under 640px, the same breakpoint as a widget's `viewport`), `narrow` keeps them off a wider window. Empty (the default) draws them everywhere, as before.
- Schema: `config.headerActionsViewport` (`wide` | `narrow`).
