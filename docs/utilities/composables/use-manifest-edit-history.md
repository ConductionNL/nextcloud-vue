# useManifestEditHistory

Thin Vue 2.7 reactive wrapper around [`createManifestEditHistory`](../create-manifest-edit-history.md) — a bounded undo/redo history over manifest-shaped JSON. Contains no history logic of its own beyond mirroring the core util's `canUndo` / `canRedo` / `size` / `current` into reactive `ref`s after every mutating call, so a template can bind `v-if="history.canUndo.value"` / `@click="history.undo"` directly.

## When to use

- An editor (OpenBuilt's builder, or any future manifest/form editor) that mutates a working manifest and needs undo/redo with reactive button state.
- Anywhere `createManifestEditHistory` would apply, but the caller is a Vue 2.7 component wanting `computed`-friendly refs instead of re-reading plain getters after every mutation.

## Signature

```js
import { useManifestEditHistory } from '@conduction/nextcloud-vue'

const history = useManifestEditHistory({ limit: 100, coalesceMs: 500 })
// { push, undo, redo, clear, canUndo, canRedo, size, current }
```

Options are forwarded verbatim to `createManifestEditHistory` — see its doc for `limit` / `coalesceMs` / `now`.

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `push(state, label?)` | Function | Record a new state. Returns the new current snapshot, or the unchanged current snapshot when the push is a no-op. |
| `undo()` | Function | Move one entry back. Returns the new current snapshot, or `null` at the bottom. |
| `redo()` | Function | Move one entry forward. Returns the new current snapshot, or `null` at the top. |
| `clear()` | Function | Empty the history and reset every ref. |
| `canUndo` | `Ref<boolean>` | Whether an earlier entry exists. |
| `canRedo` | `Ref<boolean>` | Whether a later entry exists. |
| `size` | `Ref<number>` | Current entry count. |
| `current` | `Ref<object\|null>` | The frozen current snapshot, or `null` on an empty history. |

## Usage

```vue
<template>
  <div>
    <NcButton :disabled="!history.canUndo.value" @click="onUndo">Undo</NcButton>
    <NcButton :disabled="!history.canRedo.value" @click="onRedo">Redo</NcButton>
  </div>
</template>

<script>
import { useManifestEditHistory } from '@conduction/nextcloud-vue'

export default {
  setup() {
    const history = useManifestEditHistory({ coalesceMs: 500 })
    return { history }
  },
  methods: {
    onWidgetMoved(manifest) {
      this.history.push(manifest, 'move:widget')
    },
    onTitleEdited(manifest) {
      this.history.push(manifest, 'edit:page-title')
    },
    onUndo() {
      const previous = this.history.undo()
      if (previous) this.applyManifest(previous)
    },
    onRedo() {
      const next = this.history.redo()
      if (next) this.applyManifest(next)
    },
  },
}
</script>
```

Every returned snapshot (from `push`, `undo`, `redo`, and `current.value`) is deep-frozen — clone it into your own working copy before mutating (`this.manifest = cloneDeep(previous)`), the same way the core util expects.

## Related

- [`createManifestEditHistory`](../create-manifest-edit-history.md) — the Vue-free core: bounded stack, branch discard, coalescing, clone/freeze discipline.
