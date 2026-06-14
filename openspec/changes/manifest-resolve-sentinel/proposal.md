# Manifest `@resolve:` sentinel

## Why

Phase 3 of the OR-abstraction audit (2026-05-03) had three apps —
mydash, larpingapp, softwarecatalog — each face the same problem
when drafting their `src/manifest.json`: the `pages[].config.register`
and `config.schema` fields want a register slug or schema slug, but
those values are typically configured per-tenant via `IAppConfig`
keys (e.g. `theme_register`, `listing_schema`). Hardcoding the slugs
in the manifest defeats per-tenant configurability; reading them
client-side defeats the manifest's static-validation property.

Phase 3 agent 1 introduced a sentinel value `@resolve:{key}` as a
local pre-processor convention: at manifest-load time, the loader
resolves any `@resolve:foo_register` value by looking up the
`IAppConfig` key `foo_register` for the active app and substituting
the result. The agent flagged this as an open question in
`larpingapp/openspec/changes/larpingapp-adopt-or-abstractions/design.md` Q1 + the matching softwarecatalog Q1: should this stay a per-app
local convention, or should `@conduction/nextcloud-vue` ship it as
an upstream loader feature?

## What Changes

Adopt `@resolve:{key}` as a **canonical sentinel** in
`@conduction/nextcloud-vue`'s manifest loader. Every `string`-typed
field in `pages[].config` MAY contain the sentinel; the loader
resolves it via the consuming app's `IAppConfig` at load time.

Specifically:

- Extend `useAppManifest()` in `src/composables/useAppManifest.js` to
  walk every `string`-typed value in the merged manifest and, when
  the value matches `^@resolve:([a-z][a-z0-9_-]*)$`, replace it with
  the result of `getAppConfigValue(appId, key)`.
- The `getAppConfigValue` helper is already accessible via
  `@nextcloud/initial-state` for keys provisioned at server-side
  render time, OR via a thin `axios.get('/index.php/apps/{appId}/api/configs/{key}')`
  for runtime fetch. Loader picks the cheaper available source.
- The substitution is **best-effort**: if the key is unset, the
  sentinel is replaced with `null` (NOT empty string — null
  signals "explicit unset" so downstream renderers can show a
  "not configured" empty state). A `console.warn` is emitted to the
  developer console so it's debuggable.
- The substitution happens once per manifest load, AFTER the
  bundled-manifest + backend-merge phase, BEFORE the validator
  runs. The validator sees the resolved values, not the sentinels.
- Schema validation MUST accept `@resolve:{key}` as a valid string
  for any `string`-typed field. The schema regex (where applicable)
  permits the sentinel as an escape.
- The sentinel is **only valid** in `config` blocks. It is NOT valid
  in `route` paths, `id`s, or other top-level fields where dynamic
  resolution would break router invariants.

## Problem

Without the sentinel, consumers face three bad options:

1. **Hardcode the slug** — breaks per-tenant config; admins can't
   change the register without rebuilding the app.
2. **Resolve client-side in a custom hook** — every adopting app
   reinvents the same loader logic; no static validation; no
   manifest-driven indirection.
3. **Resolve server-side in the `/api/manifest` backend hook** —
   forces every app to implement the backend hook just to swap
   strings; defeats the bundled-only-Tier-1 path.

Phase 3 agent 1's local-only resolver works but locks each app into
its own pre-processor. Three apps already need it; the rest will
follow as adoption progresses (every app with a CRUD register pattern
hits this).

## Proposed Solution

Promote the sentinel to canon. Loader-side substitution; validator
opacity (validator sees resolved values); empty-state semantics on
unset (null, not empty string).

The implementation surface is small: ~50 lines in
`useAppManifest.js`, ~10 lines of test fixture, a docs page.

## Out of scope

- Multi-key resolution (`@resolve:foo_register|bar_register|baz`) — defer; single-key suffices
  for every observed use case.
- Defaults inside the sentinel (`@resolve:foo_register?defaultSlug`) — defer; if a register
  is missing, the page renders empty; defaults are an admin-config
  responsibility.
- Resolution at validate-time only (without runtime substitution) —
  not useful; consumers want the live value.
- Per-tenant overrides on top of the sentinel — handled implicitly by
  `IAppConfig` being per-tenant.

## See also

- Phase 3 audit follow-up: agent 1 introduced the sentinel locally
  in mydash + larpingapp + softwarecatalog adoption changes; this
  upstream change canonicalises it.
- `add-json-manifest-renderer/specs/json-manifest-renderer/spec.md` —
  parent contract; this change extends the loader behaviour.
- Companion change: `manifest-page-type-extensions` (ships
  alongside) — every new page type's `config` accepts `@resolve:`.
