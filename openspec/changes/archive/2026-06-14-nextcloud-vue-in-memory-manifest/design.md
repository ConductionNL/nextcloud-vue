# Design: nextcloud-vue-in-memory-manifest

## Context

`useAppManifest` lives at [`src/composables/useAppManifest.js`](../../../src/composables/useAppManifest.js)
in `@conduction/nextcloud-vue`. The current 1.0.0-beta.30 signature is:

```js
useAppManifest(appId: string, bundledManifest: object, options?: { endpoint?: string, fetcher?: Function })
```

It implements a three-phase flow specified by `REQ-JMR-002` of the `json-manifest-renderer`
capability: synchronous bundled load → async backend merge against
`/index.php/apps/{appId}/api/manifest` → schema validation. The bundled manifest is the
synchronous fallback if the backend is unavailable or returns an invalid override.

That contract assumes the manifest's *source of truth* is one of:

1. A static `manifest.json` shipped with the app, or
2. A backend route on the same Nextcloud server returning a JSON manifest

OpenBuilt — the upcoming Nextcloud app builder — breaks both assumptions. It mounts virtual
apps whose manifest is *constructed in memory* from store state at the moment the user picks
a slug from the sidebar. There is no static manifest (the manifest is per-slug, dynamic) and
no backend route (the builder is a frontend-only mount of arbitrary JSON). Today, OpenBuilt's
`BuilderHost.vue` works around the missing overload by:

1. Passing a sentinel `bundledManifest` (the in-memory object it wants mounted), and
2. Passing `options.endpoint` redirected to a per-slug stub URL that the local network layer
   resolves to the same in-memory object via a fetcher mock.

That round-trip is a temporary bridge (see openbuilt's `bootstrap-openbuilt/design.md`,
Decision 4). It works but is fragile: it depends on `options.endpoint` semantics that are
documented as "alternative-host deployments and tests," and it forces the consumer to fake an
HTTP fetcher. A direct in-memory overload eliminates the fragility and documents the
virtual-app-host pattern as a first-class consumer of the composable.

This design adds the in-memory overload while preserving the legacy positional signature
verbatim so no current consumer (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash,
decidesk, docudesk, larpingapp, softwarecatalog) requires any change.

## Goals / Non-Goals

**Goals:**

- Ship a clean, documented call shape `useAppManifest({ manifest, validate? })` that mounts
  an in-memory manifest with zero HTTP IO.
- Preserve 100% backwards compatibility with the existing positional signature.
- Keep behavioural parity with the existing fetch-and-merge flow's validation policy:
  validation is informational (warn + populate `validationErrors`), never blocking.
- Update TypeScript types / JSDoc so editor tooling surfaces both call shapes.
- Update the two relevant docs pages (`cn-app-root.md`,
  `composables/use-app-manifest.md`) to document the new overload.

**Non-Goals:**

- Deprecating the legacy positional signature. Both signatures coexist indefinitely; the
  positional form remains the canonical path for apps with a static `manifest.json`.
- Changing the existing fetch-and-merge code path or its validation semantics.
- Building a reactive in-memory manifest source (e.g. swapping the manifest while mounted).
  The in-memory overload returns a `ref` initialised to the input object; callers who want
  hot-swap behaviour can manage their own ref and bypass the composable — out of scope.
- Adding a strict / throwing validation mode. Validation stays informational to match
  REQ-JMR-002 precedent. See Decision 2.
- Migrating OpenBuilt's `BuilderHost.vue`. That migration is a follow-up in the openbuilt
  repo, gated on this spec landing.

## Decisions

### Decision 1 — Overload via runtime branch on first argument, not a new function name

**Choice**: Keep a single exported `useAppManifest`. Discriminate the call shape at runtime
by inspecting `typeof arguments[0]`: a `string` enters the legacy fetch-and-merge branch; a
non-null plain `object` enters the new in-memory branch.

**Alternatives considered:**

- *(a) A second exported function, e.g. `useInMemoryAppManifest`.*
  Pros: explicit, no runtime discrimination, simpler types. Cons: forks the public API
  surface; a future consumer has to choose between two functions whose return shape is
  identical; documentation duplication. Rejected.
- *(b) A union-type overload with two distinct first-argument shapes, but a separate
  implementation entry point.*
  Pros: cleaner internal code. Cons: TypeScript overloads on a JS module require a `.d.ts`
  file plus JSDoc; the discrimination still has to happen at runtime regardless. We are
  going to write the discrimination anyway — adding a separate function name on top adds
  cost without value. Rejected.

**Rationale**: The composable's return shape is identical in both branches
(`{ manifest, isLoading, validationErrors }`). Keeping a single function name with a runtime
type check is the smallest change, keeps the public surface minimal, and lets callers think
in terms of "one composable, two modes" rather than "two composables, pick wisely." The
discrimination check is one line (`typeof arguments[0] === 'string'`), trivially testable.

### Decision 2 — Validation is informational (warn + populate ref), never blocking

**Choice**: When `validate: true` and the manifest fails validation, the composable emits a
`console.warn`, populates `validationErrors.value`, and returns the manifest unchanged.
The composable does NOT throw and does NOT replace the manifest with a fallback.

**Alternatives considered:**

- *(a) Throw on validation failure when `validate: true`.* Pros: turns mounting an invalid
  manifest into a hard error caught at the consumer boundary. Cons: introduces a behavioural
  asymmetry with the existing fetch-and-merge branch (REQ-JMR-002 falls back to the bundled
  manifest silently); makes the API harder to reason about ("validation in mode X throws,
  in mode Y doesn't"). Rejected for behavioural parity.
- *(b) A third opt-in mode `validate: 'strict'` that throws.* Pros: gives consumers a hard
  guarantee when they want one. Cons: adds API surface for a use case nobody has asked for;
  speculative. Deferred — can be added later additively if a consumer needs it.

**Rationale**: Behavioural parity with the existing flow is more valuable than catching
malformed manifests at mount time. OpenBuilt's in-memory manifests come from the builder UI,
which the user can fix interactively; throwing would abort the mount and hide which fields
failed. The warn-and-populate pattern lets the consumer surface the errors however it wants
(banner, console only, ignore) without the composable making that choice.

### Decision 3 — Orthogonal to the existing flow (different code path), not a modification

**Choice**: The in-memory branch is a *separate* code path. When it runs, the
fetch-and-merge pipeline (`generateUrl`, `axios.get`, `deepMerge`, post-merge
`validateManifest`) is entirely skipped. The shared code is just the ref construction and
the return statement; everything else forks at the top of the function.

**Alternatives considered:**

- *(a) Unify under a single pipeline where the in-memory branch is "fetch returns the input
  manifest synchronously."* Pros: less branching. Cons: requires the deep-merge step to be a
  no-op (input merged with itself) and the post-merge validation to run even when the
  consumer didn't ask for it. Adds work the in-memory consumer doesn't want, conflates the
  two flows, makes it harder to reason about "does this composable call do IO?". Rejected.

**Rationale**: The two modes serve different consumers with different expectations. Apps
with a static `manifest.json` want the bundled-load-then-merge flow because they have a
backend override path. Virtual-app hosts like OpenBuilt want a direct mount with no IO. A
clean branch at the top of the function makes the distinction obvious in both code and
documentation. The spec requirement `REQ-IMM-002` codifies this no-IO guarantee.

## Risks / Trade-offs

- **Risk: TypeScript narrowing edge cases on the first argument.**
  → Mitigation: write the JSDoc overload as two separate `@type` lines (one for the string
  form, one for the object form), and add a TypeScript overload in a sibling `.d.ts` if
  this project adopts one. Until then, JSDoc + manual runtime check is sufficient — `vue-docgen-cli`
  handles JSDoc cleanly. The discrimination is a single `typeof` check.

- **Risk: The `appId` argument is unused in the in-memory branch.**
  → Mitigation: the in-memory call shape simply doesn't include an `appId` field. Callers
  who care about `appId` for logging or analytics can include it in the manifest itself
  (e.g. `manifest.id`). Open question deferred — see below.

- **Trade-off: No deprecation pressure on the positional signature.**
  Keeping both signatures forever has a maintenance cost (two paths to test, two branches in
  the JSDoc, two examples in the docs). The cost is acceptable because the positional
  signature is used by 5+ production apps and the legacy path is the *better* fit for those
  apps (they have a backend override path; in-memory would mean dropping that capability).

- **Trade-off: Validation is non-blocking.**
  Consumers who genuinely want an exception on invalid manifests have to wrap the call
  themselves (read `validationErrors.value` immediately and throw). Acceptable — see
  Decision 2 — and the same constraint applies to the legacy path today.

## Open Questions

- Should we emit a `console.warn` when consumers use the *old* positional signature with a
  redirected `options.endpoint` (the OpenBuilt-style workaround)? Provisional answer: **no**.
  The legacy signature is still a fully supported, documented API; flagging a perfectly
  legal use of `options.endpoint` would be noisy for consumers who use it for tests or
  alternative-host deployments. The cleaner path is to document the new overload as the
  preferred way to mount in-memory manifests and let consumers migrate naturally.

- Should the in-memory branch accept an `appId` in the options object for logging /
  analytics consistency with the legacy branch? Provisional answer: **no for now**. If a
  later consumer needs it, we add `{ manifest, validate?, appId? }` additively — it costs
  nothing to defer. The current OpenBuilt consumer puts its slug inside the manifest itself
  (`manifest.id`), which is the appropriate location.

## DEFERRED_QUESTIONS

1. Should validation gain a future `validate: 'strict'` mode that throws on failure? Defer
   until a consumer asks for it.
2. Should the in-memory branch accept an optional `appId` for parity with the legacy
   signature (logging/analytics)? Defer until a consumer asks for it.
3. Should the composable emit a deprecation warning when `options.endpoint` is used in the
   OpenBuilt-style redirection pattern? Provisional answer in the design body is "no" —
   confirm with maintainers before this spec lands. Open Question owner: Ruben.
