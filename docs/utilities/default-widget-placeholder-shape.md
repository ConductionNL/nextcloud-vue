# DEFAULT_WIDGET_PLACEHOLDER_SHAPE

The shape a widget waits in when nothing declares one: `'rows'`. [`resolveWidgetPlaceholder`](./resolve-widget-placeholder.md) returns it when neither the manifest, the registry nor the Nextcloud widget descriptor declares a valid placeholder, for example for another vendor's Nextcloud widget.

## Import

```js
import { DEFAULT_WIDGET_PLACEHOLDER_SHAPE } from '@conduction/nextcloud-vue'
```
