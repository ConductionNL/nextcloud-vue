# CnAppRoot app-availability guard

## Why

Every fleet app that depends on **OpenRegister** as its data store
(`decidesk`, `pipelinq`, `procest`, `zaakafhandelapp`,
`softwarecatalog`) ships its own copy of an "OpenRegister is
required" empty-state. The wrappers all do roughly the same thing:
hit the capabilities API on mount, compare against a hard-coded
list, and render an `<NcEmptyContent>` with a link to
`/index.php/settings/apps/integration/openregister`. The copy
drifts, the App Store URLs drift, and the fix-it-yourself UX
drifts.

CnAppRoot is the right place to consolidate this guard:

- Every Conduction app already wraps its router-view in CnAppRoot
  (post manifest adoption — Hydra ADR-024).
- CnAppRoot already orchestrates phases (loading →
  dependency-missing → shell), so the guard slots into the same
  state machine without churn.
- The library already knows about OpenRegister — schemas, registers,
  the object-store composable, the file picker — so it owns the
  "no OR, no app" contract.
- Centralising the guard means a single `t()` source for the
  empty-state copy, a single canonical App Store link, and a single
  place to evolve the contract (e.g. "and openconnector for
  push" later) without touching every consumer.

## What Changes

CnAppRoot gains a `requiresApps` prop with default
`['openregister']`. On mount, CnAppRoot calls `getCapabilities()`
from `@nextcloud/capabilities` once and compares the returned
capability keys against `requiresApps`. Missing required apps land
the user on a default `<NcEmptyContent>` with the OpenRegister app
icon, an i18n title and description, and a primary action linking
to the Nextcloud integration page for OpenRegister.

The guard is **always on by default**. Apps that don't depend on
OpenRegister (the styleguide, the docs site, future utility apps)
opt out by passing `:requires-apps="[]"`.

### Default behaviour

- `requiresApps` defaults to `['openregister']` — fleet apps gain
  the guard for free, no consumer-side change.
- One round-trip through `getCapabilities()` on `mounted()`. The
  result is stored on the component instance (`missingApps`,
  `capabilitiesLoading`) — no module-level cache, no second
  request per route change.
- While the check is in flight, CnAppRoot renders a thin
  `<NcLoadingIcon />` so slow connections don't flash the renderer
  briefly before the empty state replaces it.
- When `getCapabilities()` rejects (admin-restricted, offline, IP
  block) CnAppRoot falls through to the renderer rather than
  blocking the app on a flaky check. The error is logged via
  `console.warn` for debuggability.

### Empty-state escape hatch

A `#or-missing` scoped slot (passing `{ missingApps }`) lets
consumer apps replace the default empty-state when their UX needs
something custom — e.g. softwarecatalog wants to surface a CTA to
its public landing page instead of the integration link. The
default content is rendered when the slot is unset.

### Opt-out

```vue
<CnAppRoot :manifest="manifest" app-id="docs" :requires-apps="[]">
  <!-- styleguide / docs site / no-OR utility app -->
</CnAppRoot>
```

An empty array short-circuits the entire check — no capabilities
request, no loading state, no missing-apps gate. The renderer
mounts immediately.

### Forward-compat

Multi-app future-proofing is free: a future docudesk-derived app
that needs both OpenRegister and openconnector can declare
`:requires-apps="['openregister', 'openconnector']"` and get the
same empty-state behaviour for either missing dependency.

## Problem

Without this change, every Conduction app duplicates the
"OpenRegister missing" wrapper:

- `procest/src/App.vue` ships a hand-rolled `OrMissing` component
  that calls `getCapabilities()` directly and renders a custom
  empty-state.
- `decidesk`, `pipelinq`, `zaakafhandelapp`, `softwarecatalog`
  each have variants of the same code with subtly different copy
  and slightly different App Store URLs.
- Adding a second required app (e.g. `openconnector` for push) is
  a 5-PR fan-out across the fleet.

Centralising the guard removes the duplication and gives the
library one canonical place to evolve the contract.

## Proposed Solution

A `requiresApps` array prop on `CnAppRoot` that defaults to
`['openregister']`, a one-shot capabilities check on `mounted()`,
a gate in the render template that runs **before** the existing
phase machine (loading → dependency-missing → shell), and a
`#or-missing` slot for consumer overrides.

The guard is layered ABOVE the `manifest.dependencies` system
that's already in place: the `dependencies` block remains the
manifest-driven mechanism for declaring per-app dependencies in
the manifest itself, while `requiresApps` is the **prop-level**
guard for "this app cannot function at all without these
capabilities". The two coexist — `requiresApps` checks
capabilities, `manifest.dependencies` checks installed/enabled
state via `useAppStatus`.

### Why a prop rather than a manifest field

Putting the OpenRegister requirement in the manifest would force
every fleet manifest to declare it explicitly — repeating the
same line in five (and growing) places. A prop-level default lets
the library encode the convention once. Apps that need to
override (the styleguide opting out, a future app declaring extra
apps) do so at the consumer site where the deviation is visible.

### Why capabilities API

`getCapabilities()` from `@nextcloud/capabilities` is the standard
Nextcloud bootstrap surface. It's already a dependency of the
library (and in use by `useAppStatus.js`), it's available on
every authenticated page, and it surfaces `openregister` as a
top-level key when OpenRegister is installed and enabled for the
current user. One round-trip on mount, no per-page polling.

### Why fall through on network failure

A capabilities-API failure (admin-restricted, network blip, CORS
misconfig) shouldn't block the app. The app's actual API calls
will hit OR's endpoints anyway and surface a more actionable
error if OR is genuinely missing. Better to render the renderer
and let the data layer report the real failure than to hide
behind a guard error screen on every transient network issue.

## Out of scope

- Polling for OpenRegister enablement after mount. The guard is
  a one-shot check; users who install OpenRegister mid-session
  will see the empty state until they refresh. (The empty
  state's primary action links to the integration page, where the
  user enables the app and naturally returns to the host app.)
- Migrating consumer apps in this PR. The default behaviour is
  additive; consumer apps gain the guard automatically. A
  follow-up PR per consumer drops their hand-rolled wrapper. See
  the migration path in the PR body.
- An i18n key for "your administrator can install
  OpenRegister". The default copy is generic; consumer apps that
  want admin-specific copy should override via `#or-missing`
  rather than introducing per-environment branching in the
  library.
- A `requiresFeatures` prop for finer-grained capability checks
  (e.g. "OR with chat capability"). Capabilities-API checks
  whether the app exists; feature-flagging belongs to the
  consumer's own runtime checks once the app is mounted.

## See also

- `nextcloud-vue/src/composables/useAppStatus.js` — adjacent
  composable that checks per-`appId` install/enable status. The
  `requiresApps` guard is complementary: it answers "is this
  capability available right now" via the capabilities bootstrap
  rather than via `OC.appswebroots`. `useAppStatus` continues to
  back the `manifest.dependencies` channel.
- `nextcloud-vue/openspec/changes/add-json-manifest-renderer/specs/json-manifest-renderer/spec.md` —
  parent contract; CnAppRoot already orchestrates loading →
  dependency-missing → shell. This change adds a fourth phase
  ahead of the existing three.
- Hydra ADR-024 (App manifest fleet-wide adoption) — every
  Conduction app wraps in CnAppRoot, so the prop default reaches
  the entire fleet.
- `procest/src/App.vue` — current hand-rolled OR-missing wrapper
  that this change replaces fleet-wide.
