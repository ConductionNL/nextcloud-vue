# CnAppTile

One app as a square link in a solid colour, with the app's icon large and white in the middle and no visible text. The app's name is the link's accessible name and its tooltip. A focused tile shows a focus ring.

The icon is the app's own SVG used as a mask over white, so any navigation icon draws as a crisp white glyph at any size. Without an icon the tile draws a grid glyph.

## Usage

```vue
<CnAppTile href="/apps/mail/" label="Mail" icon="/apps/mail/img/mail.svg" app-id="mail" colour="navy" :count="3" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `href` | `String` | required | The app's address. |
| `label` | `String` | required | The app's name: the accessible name and the tooltip. |
| `icon` | `String` | `''` | The app's icon URL, an SVG. |
| `appId` | `String` | `''` | The app id, which picks the default colour. |
| `colour` | `String` | `''` | A key of [`APP_TILE_COLOURS`](../utilities/app-tile-colours.md); empty uses the app's default colour. |
| `count` | `Number` | `null` | New items in the app. 0 or null shows no bubble; above 99 shows "99+". The count is part of the accessible name. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `open` | `MouseEvent` | The tile was clicked. |
