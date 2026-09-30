# followLinkClick

Click handler for a real `<a href>` that routes inside the app. A plain click goes through the router, so the app does not reload; a ctrl/cmd/shift/alt or middle click, or one a handler already prevented, is left to the browser, so the link still opens in a new tab or can be copied.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `event` | `MouseEvent` | The click event. |
| `target` | `string \| object` | The router location the link points at. |
| `router` | `object` | The app's router. |

Returns `true` when the app navigated.

## Usage

```vue
<a :href="resolveHref(target, $router)" @click="followLinkClick($event, target, $router)">
	{{ label }}
</a>
```

```js
import { followLinkClick, resolveHref } from '@conduction/nextcloud-vue'
```

`NcButton` and `NcActionRouter` with `to` already behave this way; use this helper for a plain `<a>`. For a row or card that cannot be an `<a>`, see [`openRowTarget`](./open-row-target.md).
