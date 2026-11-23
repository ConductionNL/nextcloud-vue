# defaultAppTileColour

The colour key an app tile gets when it names none: a fixed one for the common apps (Calendar primary, Mail primary-deep, Talk work-ink), otherwise one picked from a hash of the app id. The same app always gets the same colour.

## Import

```js
import { defaultAppTileColour } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function defaultAppTileColour(appId: string): string
```
