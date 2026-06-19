# useManifestEditor

`useManifestEditor(baseRef, options?)` is the edit-mode state machine behind
in-app manifest editing (ADR-041). It holds a `base` (the live, rendered
manifest) and, while editing, a deep-cloned `working` copy that the grid and the
edit modals mutate. The base is never touched until a successful Save; on Save the
minimal delta is computed via [`diffManifest`](../diff-manifest.md) and handed to
the caller to persist (the library does not own the persistence endpoint).

## Import

```js
import { useManifestEditor } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function useManifestEditor(
  baseRef: Ref<object>,                     // e.g. the manifest ref from useAppManifest
  options?: { persist?: (delta: object) => void | Promise<void> },
): {
  editing: Ref<boolean>
  working: Ref<object | null>
  dirty: ComputedRef<boolean>               // working differs from base
  source: ComputedRef<object>               // working while editing, else base
  enter: () => void                         // clone base → working, editing = true
  cancel: () => void                        // discard working, editing = false
  save: () => Promise<object>               // diff → persist → adopt working as base
}
```

## Behaviour

- **`enter()`** deep-clones `base` into `working` (`structuredClone`, JSON
  fallback) and sets `editing`. The base is untouched.
- **`dirty`** is `true` only when `working` differs from `base`.
- **`save()`** computes `delta = diffManifest(base, working)`, awaits
  `options.persist(delta)` if provided, then adopts `working` as the new `base`
  and clears `editing`/`dirty`. A persist **throw aborts** the save — base and
  editing state are preserved so the user can retry or cancel.
- **`cancel()`** discards `working` and leaves edit mode without persisting.
- Bind the renderer to **`source`** so nav, grids and sidebar read the active
  manifest (working while editing, base otherwise).

## Example

```js
const { manifest } = useAppManifest('myapp', bundled)
const editor = useManifestEditor(manifest, {
  async persist(delta) {
    await axios.put(generateUrl('/apps/openbuild/api/app-overrides/myapp'), delta)
  },
})
```

## Related

- [`diffManifest`](../diff-manifest.md) · [`mergeManifestDelta`](../merge-manifest-delta.md)
- [CnOpenBuildEditButton](../../components/cn-open-build-edit-button.md)
