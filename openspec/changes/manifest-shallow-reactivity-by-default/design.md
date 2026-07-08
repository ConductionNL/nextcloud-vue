## Context

Two composables independently touch the manifest object's reactivity today:

1. `useAppManifest.js` — `ref(bundledManifest)` (`loadFromBackend`, line 179) and
   `ref(input.manifest)` (`loadInMemory`, line 143). Whichever of these runs first (always —
   it's the app's own bootstrap, called before `<CnAppRoot :manifest="manifest">` mounts) performs
   the first, and normally only, deep-reactive conversion of the manifest object.
2. `CnAppRoot.vue:1013` — `const baseRef = ref(props.manifest)`. Vue 2's `observe()` internally
   checks for an existing `__ob__` marker on an object before converting it; if `useAppManifest`'s
   ref already made the object reactive, this second `ref()` call is a cheap no-op today. If we
   make `useAppManifest`'s ref shallow, this second call becomes the *only* place deep conversion
   can happen — which is exactly the lever this change uses.

`useManifestEditor.js`'s docblock is explicit about *why* mutation must happen in place rather
than via ref-swapping: `CnAppNav`, `CnPageRenderer`, and any descendant that received the manifest
via Vue 2's `provide`/`inject` captured that specific object reference when it was created.
Swapping `baseRef.value` to a different object (even one with identical contents) would not
propagate to those already-`inject`-ed references — only mutating the object those descendants
already hold does. This is a real, load-bearing constraint, not an oversight.

## Goals / Non-Goals

**Goals**: skip deep-reactive conversion of the manifest tree for the (currently: all) apps that
don't have OpenBuild installed and never enter edit mode; make that skip transparent to
`useManifestEditor`'s in-place-mutation contract.

**Non-Goals**: this change does not touch OpenBuild's editor UX, does not change what
`useManifestEditor` returns, and does not attempt to make the *editing* path any cheaper — editing
is rare (admin-only, opt-in) and already pays for deep reactivity today; that's unchanged.

## Decisions

### 1. `useAppManifest`: shallow ref, `markRaw` the manifest payload

```js
import { shallowRef, markRaw } from 'vue'
// loadInMemory:
const manifest = shallowRef(markRaw(input.manifest))
// loadFromBackend, on publish:
manifest.value = markRaw(resolved)
```

`shallowRef` means Vue only tracks reactivity on `.value` reassignment (the ref itself), not on
the referenced object's properties. `markRaw` additionally stops Vue from ever converting that
object even if something downstream calls `reactive()`/`ref()` on it *again* naively — it's the
explicit "this object is permanently exempt" marker. Both are needed: `shallowRef` for the
container, `markRaw` for defense-in-depth against a future composable doing `ref(manifest.value)`
without knowing about this decision.

This is safe for every existing read-only consumer: `CnAppNav`, `CnPageRenderer`,
`CnDashboardPage`, etc. all *read* `manifest.pages`/`manifest.menu`, they don't mutate it, and
Vue's template rendering re-runs whenever the **ref** changes (`manifest.value = resolved`
already triggers the existing "backend merge replaces bundled manifest" reactivity today — that
continues to work identically, since the ref reassignment itself is still tracked).

### 2. `CnAppRoot`: upgrade to deep-reactive in place, gated on `openBuildAvailable`

```js
import { reactive, watch } from 'vue'

const baseRef = ref(props.manifest) // shallow-marked object from useAppManifest; this ref()
                                      // wrapping is cheap — the object itself stays raw until §2b

function upgradeToEditable(manifestObj) {
  if (!manifestObj || manifestObj.__cnReactiveUpgraded) return
  reactive(manifestObj) // Vue 2.7: converts IN PLACE, same object reference, no clone
  Object.defineProperty(manifestObj, '__cnReactiveUpgraded', { value: true, enumerable: false })
}

watch(openBuildEditable, (available) => {
  if (available) upgradeToEditable(baseRef.value)
}, { immediate: true })
```

`Vue.observable()` (Vue 2's original API, still available in 2.7 as an alias consideration) and
Vue 2.7's Composition-API `reactive()` both convert an existing plain object's properties to
getter/setter pairs **in place**, returning the same reference — this is different from Vue 3
where `reactive()` returns a *Proxy wrapping* the original object (a different reference). Vue
2.7's `reactive()` retains Vue 2's original `Object.defineProperty` semantics under the hood, so
the in-place guarantee `useManifestEditor` depends on holds. This must be verified against the
exact Vue version pinned (`vue@^2.7.16` per `package.json` devDependencies) as part of task
verification — this is the single riskiest technical assumption in this change.

The `__cnReactiveUpgraded` marker prevents a double-`reactive()` call (idempotent no-op in Vue 2
anyway via the `__ob__` check, but explicit is cheaper to reason about and test).

### 3. `useManifestEditor.enter()` as a fallback upgrade point

In case `openBuildAvailable` becomes true asynchronously after mount but before `CnAppRoot`'s
`watch` fires (unlikely given `immediate: true`, but `useAppStatus`'s underlying capability check
is itself async), `enter()` calls the same `upgradeToEditable(baseRef.value)` before proceeding
with its existing `deepClone` snapshot — belt-and-suspenders, not a new mechanism.

## Risks / Trade-offs

- **Vue 2.7 `reactive()` in-place semantics is the load-bearing assumption.** If it does NOT
  preserve object identity the way Vue 2's classic `Vue.observable()` does, this design breaks
  OpenBuild's live editing silently. Task list requires an explicit unit test asserting
  `reactive(obj) === obj` reference equality before relying on it, and a full manual OpenBuild
  edit-session regression test (see tasks.md §4).
- **`markRaw` interacts with Vue's template compiler caching** — components that spread the
  manifest into local reactive state (e.g. `const local = reactive({ ...manifest.value })`) would
  still get reactivity on that local copy (spreading copies values, `markRaw` only prevents the
  *original* object from being wrapped) — grep confirms no such spread pattern exists today, but
  this is worth a repo-wide sweep as a task, not an assumption.
- **`CnAppRoot`'s watch on `openBuildEditable` fires once OpenBuild becomes available and never
  reverts** — this is intentional (once upgraded, keep it upgraded rather than flip-flopping
  reactivity mid-session if OpenBuild is disabled/enabled repeatedly), but should be documented in
  the composable's JSDoc so it isn't mistaken for a bug later.
