# LEGACY_VIEW_QUERY_KEY

The query key that carried a saved view before a view had a route of its own.

```js
import { LEGACY_VIEW_QUERY_KEY } from '@conduction/nextcloud-vue'
```

Value: `'view'`. So `/cases?view=42` is a link somebody already sent.

Those links keep working. On a page that declares places, `?view=42` redirects to the view route, which leaves one canonical address instead of two that drift apart (ADR-052). On a page that declares nothing, the query key still applies the view the old way.

Use the constant when you read or strip the key, so the day the redirect is retired there is one place to change.
