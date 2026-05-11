# installIntegrationRegistry

Attaches the [`integrations`](./integrations.md) singleton onto `window.OCA.OpenRegister.integrations` and drains any registrations that were queued by a stub before this module loaded.

OpenRegister's main bundle calls this once at bootstrap. Consuming apps don't normally call it directly — they just `register()` on the global once the page has loaded OpenRegister.

## Bootstrap-order safety

If a consuming app's bundle loads before OpenRegister's, it installs a queue stub:

```js
window.OCA = window.OCA || {}
window.OCA.OpenRegister = window.OCA.OpenRegister || {}
window.OCA.OpenRegister.integrations = window.OCA.OpenRegister.integrations || {
  _queue: [],
  register(entry) { this._queue.push(entry) },
}
```

When OpenRegister loads and calls `installIntegrationRegistry()`, every queued entry is replayed against the real registry in insertion order. Failed replays are logged in development and skipped in production — they never block subsequent registrations.

## Signature

```js
import { installIntegrationRegistry } from '@conduction/nextcloud-vue'

installIntegrationRegistry()                  // attach to window
installIntegrationRegistry(fakeWindow)        // attach to test double
```

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `globalRef` | `object?` | `window` | Global to attach to. Pass an override in tests to avoid mutating the real `window`. |

## Returns

The installed registry instance (the [`integrations`](./integrations.md) singleton).

## See also

- [`integrations`](./integrations.md) — the singleton this installs
- [`createIntegrationRegistry`](./create-integration-registry.md) — isolated instances for tests
