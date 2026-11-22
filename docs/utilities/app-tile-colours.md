# APP_TILE_COLOURS

The colours an app tile can take, in the order a colour picker offers them: `{ key, label, hex }`. Each colour draws as the token `--cn-app-tile-<key>` with `hex` as the fallback, so a theme can change it. The fallbacks follow the Zuiddrecht palette (blue `#3669a5`, red `#cc0000`), and every one keeps at least 3:1 against the white icon (WCAG 1.4.11).

## Import

```js
import { APP_TILE_COLOURS } from '@conduction/nextcloud-vue'
```

Keys: `blue`, `red`, `green`, `navy`, `purple`, `teal`, `orange`, `slate`. See [`appTileColourValue`](./app-tile-colour-value.md) and [`defaultAppTileColour`](./default-app-tile-colour.md).
