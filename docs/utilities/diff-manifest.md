# diffManifest

`diffManifest(base, edited)` produces the **minimal keyed delta** between two
manifests. It is the inverse of [mergeManifestDelta](./merge-manifest-delta.md):

```js
mergeManifestDelta(base, diffManifest(base, edited)).manifest // deep-equals `edited`
```

OpenBuilt's editor calls it on save so a built app stores only the differences
from its base, not a frozen copy of the whole manifest.

## Import

```js
import { diffManifest } from '@conduction/nextcloud-vue'
```

## Signature

```ts
function diffManifest(base: object, edited: object): object // the delta ({} when equal)
```

## Behaviour

- Unchanged scalars / objects / arrays are omitted from the delta.
- A keyed array (`pages` / `widgets` / `menu`) yields per-entry patches (keyed
  object with only the changed fields), full entries for additions, and
  `{ <key>, $op: "remove" }` markers for entries dropped by `edited`. A
  `__order` map is emitted only when the entry order cannot be reproduced by
  the merge's base-then-appended ordering.
- A mergeable array whose entries lack the identity field cannot be diffed by
  key, so the **whole array** is emitted (replacement) and a `console.warn` is
  logged. Add stable `id`s to widget entries to enable fine-grained deltas.

> **Limitation:** deleting a plain (non-keyed) object key is not expressible as
> a delta — only keyed-array entry removals are. This matches the merge engine.

## Example

```js
const edited = structuredClone(base)
edited.pages[0].title = 'Dashboard'

diffManifest(base, edited)
// → { pages: [ { id: 'home', title: 'Dashboard' } ] }
```

## Related

- [mergeManifestDelta](./merge-manifest-delta.md) — applies the delta.
