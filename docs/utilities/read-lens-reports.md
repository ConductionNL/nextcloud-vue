# readLensReports

Reads the personal-lens reports of an OpenRegister list response: the body's `@self.lenses`, or `{}` when it has none. OpenRegister adds a report for each personal lens the request asked for (openregister#4514 adds it for `_recent`).

## Signature

```js
import { readLensReports } from '@conduction/nextcloud-vue'

const reports = readLensReports(responseBody)
// { recent: { available: false, reason: 'audit-trail-disabled' } }
```

| Argument | Type | Description |
|----------|------|-------------|
| `body` | `object \| null` | A parsed list response. |

Returns an object keyed by lens name without the leading underscore (`recent` for `_recent`), each `{ available: boolean, reason: string \| null }`. A body without `@self.lenses`, or with something other than an object there, gives `{}`.

The object store calls it in `fetchCollection` and keeps the result as `lenses[type]`; `useListView` exposes it as `lenses`. Turn a report into text with [`lensUnavailableText`](./lens-unavailable-text.md).
