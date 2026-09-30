# resolveHref

The `href` for a navigation target: a URL is returned as is, a vue-router location is resolved through the router, which adds the app's base. A string is always treated as a finished URL, so pass a router path as `{ path }`.

## Parameters

| Name | Type | Description |
|------|------|-------------|
| `target` | `string \| object \| null` | A URL, or a vue-router location. |
| `router` | `object` | The app's router, needed for a location. |

Returns the href, or `''` when there is no target, no router for a location, or the router cannot resolve it.

## Usage

```js
import { resolveHref } from '@conduction/nextcloud-vue'

// With createWebHistory('/index.php/apps/pipelinq'), as a Nextcloud app mounts:
resolveHref('/index.php/apps/files', this.$router)                    // → '/index.php/apps/files' (as is)
resolveHref({ name: 'LeadDetail', params: { id: 7 } }, this.$router)  // → '/index.php/apps/pipelinq/leads/7'
resolveHref({ path: '/leads/7' }, this.$router)                        // → '/index.php/apps/pipelinq/leads/7'
```

Used by [`followLinkClick`](./follow-link-click.md) and [`openRowTarget`](./open-row-target.md).
