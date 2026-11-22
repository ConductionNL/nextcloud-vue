# APP_TILE_COLOURS

The colours an app tile can take, in the order a colour picker offers them: `{ key, label, hex }`. The colours are the eight theme token roles of the design system. Each draws as `--cn-app-tile-<key>`, then the theme's `--sc-<key>`, then `hex`, so the tile follows the theme. The fallbacks are the Zuiddrecht values (primary `#3669a5`, accent `#cc0000`), and every one keeps at least 3:1 against the white icon (WCAG 1.4.11).

## Import

```js
import { APP_TILE_COLOURS } from '@conduction/nextcloud-vue'
```

Keys: `primary`, `primary-deep`, `accent`, `accent-deep`, `work-ink`, `work-text`, `work-muted`, `work-field`. See [`appTileColourValue`](./app-tile-colour-value.md) and [`defaultAppTileColour`](./default-app-tile-colour.md).
