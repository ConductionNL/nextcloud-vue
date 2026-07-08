---
kind: code
depends_on:
  - cn-openbuild-edit-shell   # defines useOpenBuildEditAvailability() + ADR-041 in-place-edit contract this change must preserve
  - nextcloud-vue-in-memory-manifest   # defines the in-memory useAppManifest branch this change also touches
---

## Why

Every app using `CnAppRoot` (the full manifest-shell tier: OpenRegister, OpenCatalogi, Procest,
Pipelinq, MyDash, decidesk, docudesk, larpingapp, softwarecatalog) pays for **deep Vue reactivity
conversion of its entire app manifest JSON tree on every page load**, whether or not the app ever
edits its manifest:

- `src/composables/useAppManifest.js:143` (`loadInMemory`) and `:179` (`loadFromBackend`) both do
  `ref(manifestObject)`. In Vue 2.7, `ref()` on a plain object internally calls `reactive()`,
  which walks the *entire* object graph — every page, every widget, every nested `config` block —
  and converts each property to a getter/setter pair via `Object.defineProperty` (Vue 2's
  `Object.defineProperty`-based reactivity, not Vue 3's `Proxy`). For a manifest with dozens of
  pages and widgets this is real, measurable work done synchronously at mount time, for a value
  that in the common case (no in-app editing) is only ever read, never mutated in place after the
  initial `ref.value` assignment.
- `src/components/CnAppRoot/CnAppRoot.vue:1013` makes it structural, not incidental:
  `const baseRef = ref(props.manifest)` runs **unconditionally** inside `CnAppRoot`'s `setup()`,
  feeding `useManifestEditor` (ADR-041's in-app editing state machine) — regardless of whether
  the OpenBuild app (the only consumer of in-app editing) is even installed. `openBuildAvailable`
  (`CnAppRoot.vue:1023-1026`, derived from `useOpenBuildEditAvailability()`) only gates whether the
  **edit button** is shown — it does not gate whether the manifest is made deep-reactive. So every
  app pays the full deep-conversion cost even on instances where OpenBuild isn't installed at all.
- Confirmed via `grep -rln markRaw src` returning **zero** results anywhere in the package: no
  static config object anywhere in the library — not the manifest, not schema definitions passed
  to form/table generators, not the compiled-validator's schema constant — is ever exempted from
  Vue's reactivity conversion, even where nothing downstream ever mutates it.

This is not a "just add `markRaw`" fix, though — `useManifestEditor.js`'s own docblock
(`src/composables/useManifestEditor.js:5-13`) explains *why* the manifest is deep-reactive today:
"edits are applied IN PLACE to the live manifest... Vue 2 `inject` captures the provided
`cnManifest` value once at a descendant's creation, so swapping in a separate working-copy object
would never reach already-mounted renderers... Mutating the object they already hold is what
makes edits appear live." Blanket `markRaw`/`shallowRef` would silently break OpenBuild's live
in-app editing (ADR-041) for the minority of installs that use it. The fix must be conditional.

## What Changes

- **`useAppManifest`'s `manifest` ref becomes shallow by default** (Vue 2.7 `shallowRef` instead
  of `ref`, or `markRaw` on the resolved manifest object before assigning it) for both the
  `loadInMemory` and `loadFromBackend` branches. The manifest's top-level swap (bundled → merged →
  sentinel-resolved) still triggers reactivity as today (the ref *itself* is still reactive —
  only the manifest object's internal properties stop being deep-observed).
- **`CnAppRoot` upgrades the manifest to deep-reactive in place, only when OpenBuild editing is
  actually available.** When `openBuildAvailable.value` is (or becomes) `true`, `CnAppRoot` calls
  Vue's `reactive()` (Vue 2.7) / `Vue.observable()` on the **same object reference** held by
  `baseRef.value` — not a clone, not a new ref — so already-mounted descendants (which captured
  the object via `provide`/`inject`) start observing property changes without needing to remount.
  This preserves the exact in-place-mutation contract `useManifestEditor` depends on. Apps
  without OpenBuild installed never pay the conversion cost at all.
- **`useManifestEditor.enter()`** becomes the fallback upgrade point too — if `openBuildAvailable`
  somehow lags the user actually opening the editor (edge case: app enabled mid-session), `enter()`
  ensures the live manifest is reactive-observable before edits begin, in addition to its existing
  `deepClone` snapshot for diffing.
- No public prop/event/slot signature changes. `useAppManifest`'s and `useManifestEditor`'s return
  shapes are unchanged.

## Impact

- **Affected specs**: new capability `manifest-reactivity` (this change creates it); references
  the existing `cn-openbuild-edit-shell` and `nextcloud-vue-in-memory-manifest` capabilities
  without modifying their requirements.
- **Affected code**: `src/composables/useAppManifest.js`, `src/composables/useManifestEditor.js`,
  `src/components/CnAppRoot/CnAppRoot.vue`.
- **Affected consumers**: all `CnAppRoot`-tier apps benefit (avoid deep-reactive conversion of the
  manifest tree on every boot) unless OpenBuild is installed, in which case behavior is unchanged
  (deep-reactive, as today). Apps using only `useAppManifest` directly (without `CnAppRoot`) get
  the shallow-by-default benefit unconditionally, since they never wire `useManifestEditor`.
- **Backward compatibility**: no breaking API changes. The one behavior that must be verified
  end-to-end is OpenBuild's live in-app editing continuing to work identically post-change (see
  design.md and tasks.md verification steps) — this is the change's primary risk and the bulk of
  its task list is proving that path is untouched.
