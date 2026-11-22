# CnAppTileWidget

The `app-tile` dashboard widget type: one app of the reader's Nextcloud navigation as one [`CnAppTile`](./cn-app-tile.md). The app comes from the navigation the reader sees, so an app they may not open never shows as a link; the cell then says the app is not available.

## Content

| Key | Default | Description |
|-----|---------|-------------|
| `appId` | `''` | The app the tile opens. |
| `colour` | `''` | A key of [`APP_TILE_COLOURS`](../utilities/app-tile-colours.md); empty uses the app's default. |
| `showCount` | `true` | Show the reader's notifications for the app as a count ([`notificationCountsByApp`](../utilities/notification-counts-by-app.md)). |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `Object` | `{}` | The widget content above. |
| `placement` | `Object` | `null` | The placement, part of the renderer contract. |
