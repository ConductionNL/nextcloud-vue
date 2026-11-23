# appTileColourValue

The CSS value of an app tile colour: its token with the hex fallback, such as `var(--cn-app-tile-accent, var(--sc-accent, #cc0000))`. An unknown or empty key falls back to the app's [default colour](./default-app-tile-colour.md).

## Import

```js
import { appTileColourValue } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function appTileColourValue(key: string, appId?: string): string
```
