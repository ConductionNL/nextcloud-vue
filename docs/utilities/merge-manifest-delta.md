# mergeManifestDelta

`mergeManifestDelta(base, delta)` applies a keyed structural delta to a base
manifest. Unlike a plain deep-merge (which replaces arrays wholesale), it
merges the manifest's identity-bearing arrays **by key**: `pages[]` by
`page.id`, `widgets[]` by `widget.id`, and `menu[]` by `menu.id`.

This is the engine behind the opt-in `delta` merge mode of `useAppManifest` /
`useRuntimeManifest`, and the basis for OpenBuilt storing a built app as
`baseRef + delta` instead of a frozen whole-manifest blob. It is pure and
Vue-free, so it can run client-side (editor preview) or be ported server-side.

## Import

```js
import { mergeManifestDelta } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function mergeManifestDelta(base: object, delta: object): {
    manifest: object,            // new merged manifest (inputs never mutated)
    orphanedDeltaPaths: string[] // paths of deltas that targeted a missing entry
}
```

## Semantics

- Plain objects merge recursively; scalars and **non-keyed** arrays are
  replaced (delta wins) — preserving today's deep-merge behaviour.
- In a keyed array (`pages` / `widgets` / `menu`), a delta entry whose key
  **matches** a base entry is merged into it; a delta entry whose key is
  **new** is appended.
- `{ "<key>": "x", "$op": "remove" }` deletes the matching base entry. A
  `remove` whose key is **not** present in the base is an **orphan**: skipped,
  `console.warn`-ed, and its path recorded in `orphanedDeltaPaths`.
- An optional `__order` object on the parent maps an array name to an id
  sequence (`{ "widgets": ["w2", "w1"] }`) and reorders the merged entries;
  unlisted entries keep their relative order after the listed ones. Using an
  object (not a bare array) keeps it unambiguous when a parent holds more than
  one keyed array (the manifest has both `pages` and `menu`).

## Example

```js
const base = {
    pages: [
        { id: 'home', title: 'Home', widgets: [{ id: 'w1' }, { id: 'w2' }] },
        { id: 'about', title: 'About' },
    ],
}

const { manifest, orphanedDeltaPaths } = mergeManifestDelta(base, {
    pages: [
        { id: 'home', title: 'Dashboard' },          // patch one page
        { id: 'reports', title: 'Reports' },          // append a new page
        { id: 'about', $op: 'remove' },               // remove a page
    ],
})
// manifest.pages → [{ id:'home', title:'Dashboard', widgets:[…] }, { id:'reports', … }]
// orphanedDeltaPaths → []
```

## Related

- [diffManifest](./diff-manifest.md) — produces the minimal delta this consumes.
- `useAppManifest` / `useRuntimeManifest` — pass `{ mergeStrategy: 'delta' }`.
