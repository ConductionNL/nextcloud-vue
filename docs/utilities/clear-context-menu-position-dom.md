# clearContextMenuPositionDom

Utility that clears the context-menu positioning state from the DOM — removes the cursor CSS custom properties (`CTX_MENU_CSS_VAR_X` / `CTX_MENU_CSS_VAR_Y`) and the `CTX_MENU_DATA_ATTR` data attribute set on `document.documentElement`.

Called automatically by [`useContextMenu`](./composables/use-context-menu.md)'s `close()`; exported for consumers that drive the positioning DOM directly without the composable.

```js
import { clearContextMenuPositionDom } from '@conduction/nextcloud-vue'

clearContextMenuPositionDom()
```
