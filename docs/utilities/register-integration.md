# registerIntegration

Load-order-safe entry point for a **leaf app** to register its own bespoke integration component (Path 2). It is the symmetric counterpart to [`installIntegrationRegistry`](./install-integration-registry.md), which **OpenRegister** calls to install its singleton.

A leaf app must **not** call `installIntegrationRegistry` — that replaces the global with OpenRegister's singleton and would clobber it. Use `registerIntegration` instead.

## When to use it

Two ways a leaf surfaces in a host object's sidebar / detail page:

- **Path 1 — data only.** Ship a PHP `IntegrationProvider`; OpenRegister's generic `CnIntegrationTab` / `CnIntegrationCard` render the rows. No JS contribution, works cross-app automatically.
- **Path 2 — bespoke component.** Ship a Vue component and register it with `registerIntegration`. Use this only when the generic title/subtitle/url card can't express the UX.

`registerIntegration` is the Path-2 hook.

## Signature

```js
import { registerIntegration } from '@conduction/nextcloud-vue'

registerIntegration(descriptor)            // attach to window (default)
registerIntegration(descriptor, fakeWindow) // attach to a test double
```

`descriptor` is the same shape as [`integrations.register()`](./integrations.md) — `{ id, label, icon, tab, widget, group, order, referenceType, … }`. Validation, the AD-13 collision policy, the required `tab` / `widget`, and `referenceType` defaulting all apply identically whether the call lands live or via replay.

## Load-order behaviour

- **OpenRegister already installed its singleton** → the descriptor registers live and appears in `integrations.list()` immediately.
- **OpenRegister not loaded yet** (this leaf — or another leaf — ran first) → a `{ _queue, register }` stub is installed/extended on `window.OCA.OpenRegister.integrations` and the descriptor is queued. OpenRegister replays the queue when it later calls `installIntegrationRegistry`.

You never have to hand-roll the stub — that's the whole point of this helper.

## Shipping a Path-2 leaf end-to-end

Three pieces. The JS contract (this helper) is centralised in nextcloud-vue; the other two are inherently per-app.

**1. A small global JS entry** (`src/integration.js`) — keep it tiny, just the component + the call:

```js
import { registerIntegration } from '@conduction/nextcloud-vue'
import SyncedFromTab from './integration/SyncedFromTab.vue'

registerIntegration({
  id: 'sync-contract',
  label: 'Synced from',
  icon: 'SyncOutline',
  group: 'workflow',
  order: 50,
  tab: SyncedFromTab,
  widget: SyncedFromTab,
})
```

**2. A separate webpack entry** so the global bundle is small (not the whole SPA):

```js
// webpack.config.js
entry: {
  'myapp-main': path.join(__dirname, 'src', 'main.js'),
  'myapp-integration': path.join(__dirname, 'src', 'integration.js'),
}
```

**3. Server-side global-script registration** so the bundle loads on **every** Nextcloud page (so the component is present when a *foreign* app — e.g. OpenCatalogi — renders its detail page), not only the leaf's own SPA routes:

```php
// lib/AppInfo/Application.php — in a BeforeTemplateRenderedEvent listener or boot()
\OCP\Util::addInitScript('myapp', 'myapp-integration');
```

The consuming app needs **nothing** — it renders whatever is in the registry via `CnDetailPage` / `CnObjectSidebar` and `useIntegrationRegistry`.
