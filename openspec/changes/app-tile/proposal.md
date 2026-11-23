# Proposal: app-tile

## Why

Ruben reviewed launchpad's start page on 22 November 2026. Every app should be its own tile on the grid, like a
workspace start page: a square in a solid colour, with the app's icon large and white in the middle. The `app-tiles`
widget draws all apps in one card, so a person cannot place, colour or order one app on its own.

## What changes

- `CnAppTile`: one app as a square link in a palette colour, with the app's icon in white at about 45% of the tile
  and no visible text. The app's name is the accessible name and the tooltip. An optional count shows as a bubble.
- `CnAppTileWidget`, registered as the `app-tile` widget type: content `{ appId, colour, showCount }`. The app comes
  from the reader's own Nextcloud navigation, so an app they may not open never shows. The count is the reader's
  notifications for that app.
- `CnAppTileWidgetForm`: the app, the colour and the count switch.
- `utils/appTilePalette`: eight colours as `--cn-app-tile-<key>` tokens with Zuiddrecht fallbacks, a fixed default
  colour per common app and a hashed one for the rest.
- `utils/nextcloudApps.notificationCountsByApp`: the reader's notifications counted per app, read once per page.

## Scope

nextcloud-vue only. Launchpad offers the type in its picker and starter set in its own change.
