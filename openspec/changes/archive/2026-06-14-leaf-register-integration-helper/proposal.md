# registerIntegration() — load-order-safe leaf-side registration helper

## Why

The pluggable integration registry (AD-1..AD-23) supports two ways a leaf
surfaces in a host: a PHP `IntegrationProvider` rendered by the generic
`CnIntegrationTab` / `CnIntegrationCard` (Path 1, no JS contribution), and
a bespoke Vue component the leaf registers on
`window.OCA.OpenRegister.integrations` (Path 2).

Path 2 has never actually been exercised. The only JS-side install helper
is `installIntegrationRegistry()`, which OpenRegister itself calls to
**replace** the global with the singleton and replay any queued stub. A
*leaf* app must NOT call that — it would clobber OR's singleton. So today
a leaf wanting to register a component has to hand-roll the stub-queue
pattern that currently lives only as a doc comment in `registry.js`. There
is no supported, load-order-safe "register my integration" entry point.

## What

Add `registerIntegration(descriptor)` to `src/integrations/registry.js`,
exported from the barrel. It is the symmetric counterpart to
`installIntegrationRegistry`:

- If `window.OCA.OpenRegister.integrations` is the real registry (OR
  loaded first) → register the descriptor live.
- If it's missing or is a stub-with-`_queue` (OR not loaded yet, or this
  leaf is first) → ensure a `{ _queue, register }` stub exists and push
  the descriptor; OR replays the queue when it later calls
  `installIntegrationRegistry`.

This makes a leaf's global integration bundle a one-liner:

```js
import { registerIntegration } from '@conduction/nextcloud-vue'
import SyncedFromTab from './SyncedFromTab.vue'
registerIntegration({ id: 'sync-contract', label: 'Synced from', icon: 'SyncOutline',
                      tab: SyncedFromTab, widget: SyncedFromTab, group: 'workflow', order: 50 })
```

The descriptor shape + validation is unchanged — `registerIntegration`
delegates to the same `register()` the singleton exposes, so the
collision policy (AD-13), required `tab`/`widget`, and `referenceType`
defaulting all apply identically whether the call lands live or via replay.

## Non-goals (this PR)

- The server-side global-script registration (`\OCP\Util::addInitScript`)
  and per-app webpack entry — those are inherently per-leaf and live in
  the consuming app. This PR ships only the JS contract + docs for them.
- Changing `installIntegrationRegistry` semantics (OR keeps clobber+replay).

## References

- `installIntegrationRegistry` — the OR-side counterpart this mirrors.
- registry.js:280 doc-comment — the stub pattern this helper formalises.
- openconnector — the first real Path-2 leaf, landed in a companion PR.
