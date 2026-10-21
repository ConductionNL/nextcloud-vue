# actionsForSurface

The listed actions a surface offers: those whose `surfaces` include it (`header`, `row`, `bulk` or `detail-menu`). With `include`, only those keys, in that order.

```js
import { actionsForSurface } from '@conduction/nextcloud-vue'

const rowActions = actionsForSurface(actions, 'row', ['claim', 'hold'])
```

| Param | Type | Description |
|-------|------|-------------|
| `actions` | `Array<object>` | The listed actions, as [`readObjectActions`](read-object-actions.md) answers them. |
| `surface` | `string` | Where the host offers them. |
| `include` | `Array<string>` | Optional. The keys to keep, in the order to show them. A key the list does not hold is skipped. |

An action that names no surfaces is offered on `header` and `row`.
