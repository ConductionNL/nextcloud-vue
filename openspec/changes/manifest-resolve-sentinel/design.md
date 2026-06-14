# Design: Manifest `@resolve:` sentinel

## Reuse analysis

- `useAppManifest()` already does merged-manifest assembly + validator
  invocation; we slot the resolver between those two steps.
- `validateManifest()` already runs against the assembled tree; it
  needs to accept the sentinel pattern in `config` paths (one regex
  tweak; existing per-field validation continues unchanged for the
  resolved values).
- `getAppConfigValue` from `@nextcloud/initial-state` is the canonical
  IAppConfig source on the frontend; we use it directly when keys
  are provisioned at SSR time, fall back to `axios.get` for runtime.

## Sentinel syntax

```
@resolve:<key>
```

- `<key>` matches `[a-z][a-z0-9_-]*` — IAppConfig keys are lowercase
  alphanumeric with `_` / `-`.
- The full string MUST be just `@resolve:foo_register` — partial
  substitution like `prefix-@resolve:foo` is NOT supported; the
  whole string IS the sentinel or it isn't.
- This keeps the regex simple and avoids compounding semantics.

## Resolution timing

```
useAppManifest steps:
1. import bundled (sync)
2. axios.get('/api/manifest') (async, fall-through on 4xx/5xx)
3. deepMerge(bundled, backend)
4. → resolveManifestSentinels(merged, appId)   (NEW STEP)
5. validateManifest(resolved)
6. return resolved + isLoading + validationErrors
```

The validator NEVER sees a sentinel at runtime — sentinels are
substituted before validation runs. Schema validator's permissive
acceptance is for build-time checks (when a static manifest with
sentinels is validated outside the loader, e.g. via `npm run check:manifest`).

## Empty-state semantics

When `resolveManifestSentinels` encounters `@resolve:foo_register`
but `getAppConfigValue('myApp', 'foo_register')` returns null/empty:

- The sentinel is replaced with `null` (NOT empty string).
- A `console.warn` is emitted: `Manifest sentinel '@resolve:foo_register' resolved to null (key unset)`.
- The unresolved key list is exposed via `useAppManifest()` return:
  `{ manifest, isLoading, validationErrors, unresolvedSentinels }`.

Why null and not empty string?

- Downstream renderers (e.g. `CnLogsPage`'s `config.register` field)
  can distinguish "explicitly unset, show empty state" from
  "explicitly empty string, treat as no register". Empty-string
  semantics break: a register slug `''` is NOT a valid OR slug, but
  a fetch with `''` would 404 noisily. `null` causes the renderer
  to short-circuit to the empty state cleanly.

## Where the sentinel is allowed

Allowed in: `pages[].config.*` (any string-typed field at any depth).

Disallowed in:
- `pages[].route` — router invariants need stable paths
- `pages[].id` — used for vue-router name lookup
- `pages[].component` — must match a registered customComponents key
- `pages[].headerComponent` / `actionsComponent` — same
- `menu[].route` / `menu[].id` — same as pages
- `version`, `dependencies`, `$schema` — top-level invariants
- `slots[*]` — same registry-key concern

The validator enforces this: the sentinel pattern is acceptable in
schema's `config` sub-paths, REJECTED elsewhere.

## Per-key resolution source

```
getAppConfigValue(appId, key):
  → if @nextcloud/initial-state has 'app-{appId}-{key}' → use it (zero network cost)
  → else axios.get('/index.php/apps/{appId}/api/configs/{key}') with 5-second cache
  → else null
```

Cache the runtime fetches per-(appId, key) for the page lifetime;
admin changes to IAppConfig don't auto-propagate (consistent with
the rest of the manifest's load-once model).

## Why not fix this with a richer JSON schema (e.g. allOf with `register OR @resolve:string`)?

Three reasons:

1. **Compositional overhead** — every `string`-typed config field
   would need an `allOf` wrapper accepting either the natural string
   shape (e.g. UUID) or the sentinel pattern. Doubles the schema
   size with no semantic gain; the loader does the substitution
   anyway.
2. **Validator-resolver order** — the resolver runs first, so the
   validator never sees sentinels at runtime. The `allOf` approach
   only matters for build-time validation, which is fine to keep
   simple ("any string is OK if it starts with `@resolve:`").
3. **Future extension** — if we ever add `@compute:` or `@derive:`
   sentinels, they all share the same loader-substitution model.
   The schema doesn't need to know about every sentinel kind.

## Open design questions

1. **Should the sentinel support inheritance?** E.g.
   `@resolve:theme_register` falls back to `@resolve:default_register`
   when unset. Defer; can layer this on later via a `@resolve:foo|bar`
   syntax.
2. **Should there be a build-time CLI to validate that all
   `@resolve:` keys in a manifest are actually documented in the
   app's IAppConfig schema?** Yes, eventually — `npm run
   check:manifest --strict` could do it. Defer to a successor change.
3. **Nesting depth limit?** Practically the manifest's `config`
   blocks are 1-2 levels deep; no recursive case. The walker is
   bounded by the manifest's natural depth; no infinite loop risk.
4. **What about non-string sentinels (numbers, booleans)?** Out of
   scope — config currently only uses strings + simple primitives;
   the typical use is register/schema slugs. Defer.
