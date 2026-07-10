---
status: draft
---

# Manifest Reactivity — Spec

## Purpose

Specifies the reactivity contract of the app manifest object as it flows through
`useAppManifest` → `CnAppRoot` → `useManifestEditor`: when the manifest is deep-reactive (every
nested property observed) versus shallow/raw (only the top-level ref swap observed), and how the
library upgrades between the two without breaking OpenBuild's live in-app editing.

**Files**: `src/composables/useAppManifest.js`, `src/composables/useManifestEditor.js`,
`src/components/CnAppRoot/CnAppRoot.vue`

**Cross-references**: [cn-openbuild-edit-shell](../../../changes/cn-openbuild-edit-shell/specs/cn-openbuild-edit-shell/spec.md)
(OpenBuild availability detection this capability gates on),
[nextcloud-vue-in-memory-manifest](../../../changes/nextcloud-vue-in-memory-manifest/specs/in-memory-app-manifest-loader/spec.md)
(the in-memory `useAppManifest` branch this capability also governs)

---

## ADDED Requirements

### Requirement: `useAppManifest` MUST return a shallow manifest ref by default

`useAppManifest`'s `manifest` return value MUST be a shallow ref (Vue 2.7 `shallowRef`) whose
referenced object is marked with `markRaw`, in both the legacy fetch-and-merge signature and the
in-memory signature. The ref itself MUST remain reactive — reassigning `.value` (e.g. publishing
a backend-merged or sentinel-resolved manifest) MUST still trigger dependent re-renders. Only the
manifest object's own nested properties MUST NOT be deep-observed by default.

#### Scenario: Backend merge still triggers a re-render

- GIVEN `useAppManifest('myapp', bundled)` is called and the backend serves a 200 with a valid
  manifest override
- WHEN the async merge, sentinel resolution, and validation succeed
- THEN `manifest.value` MUST be reassigned to the resolved manifest
- AND any component reading `manifest.value` MUST re-render to reflect the new manifest

#### Scenario: Mutating a nested manifest property does NOT trigger a re-render by default

- GIVEN `useAppManifest` returned a shallow manifest ref and no upgrade to deep-reactive has
  occurred
- WHEN calling code mutates `manifest.value.pages[0].title` directly (not via `.value`
  reassignment)
- THEN no dependent re-render is guaranteed to occur (this is the accepted, documented trade-off
  for apps that never edit their manifest in place)

### Requirement: `CnAppRoot` MUST upgrade the manifest to deep-reactive in place only when OpenBuild editing is available

`CnAppRoot` MUST upgrade the manifest object referenced by its internal editing `baseRef` to
deep-reactive — converting the SAME object reference in place (no clone, no ref-swap) — if and
only if OpenBuild in-app editing is available (`useOpenBuildEditAvailability()` resolves `true`).
Apps where OpenBuild is unavailable MUST NOT have their manifest object deep-reactive-converted.

#### Scenario: OpenBuild unavailable — manifest stays shallow

- GIVEN `useOpenBuildEditAvailability()` resolves `false` for the current instance/user
- WHEN `CnAppRoot` mounts and renders its manifest-driven pages
- THEN the manifest object MUST NOT undergo deep-reactive conversion at any point during the
  page's lifecycle

#### Scenario: OpenBuild available — manifest is upgraded before editing begins

- GIVEN `useOpenBuildEditAvailability()` resolves `true`
- WHEN `CnAppRoot` mounts
- THEN the manifest object referenced by `baseRef.value` MUST be converted to deep-reactive in
  place (same object reference) before or at the point the OpenBuild edit button becomes
  available to the user

#### Scenario: Live in-app editing still reflects in-place mutations after the upgrade

- GIVEN OpenBuild editing is available and the manifest has been upgraded to deep-reactive
- WHEN the user enters edit mode via `useManifestEditor` and mutates a nested property of the
  live manifest object (e.g. a widget's `gridWidth`)
- THEN every already-mounted descendant component that reads that property via the injected
  manifest reference MUST reflect the new value without requiring a remount

### Requirement: The reactivity upgrade MUST be idempotent and one-directional

Once a manifest object has been upgraded to deep-reactive, re-invoking the upgrade path (e.g. on a subsequent `props.manifest` change while OpenBuild remains available) MUST be a no-op, and the
manifest MUST NOT be downgraded back to shallow/raw for the remainder of the component's
lifecycle even if OpenBuild availability later becomes false.

#### Scenario: Re-upgrading an already-reactive manifest is a no-op

- GIVEN a manifest object has already been upgraded to deep-reactive
- WHEN the upgrade path is invoked again (e.g. via a repeated `watch` trigger)
- THEN no duplicate conversion work MUST occur and no error MUST be thrown
