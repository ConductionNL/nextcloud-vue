manifest-resolve-sentinel
---
status: draft
---
# Manifest `@resolve:` sentinel

## Purpose

Canonicalise the `@resolve:{key}` sentinel as a manifest-loader
feature in `@conduction/nextcloud-vue`. Lets consumers reference
per-tenant `IAppConfig` keys (e.g. `theme_register`,
`listing_schema`) inside `pages[].config.*` without hardcoding
slug values or rolling each app's own pre-processor.

## ADDED Requirements

### Requirement: The sentinel `@resolve:<key>` MUST be a recognised value in `pages[].config.*`

Any `string`-typed field at any depth under `pages[].config` MAY contain a sentinel `@resolve:<key>` where `<key>` MUST match `[a-z][a-z0-9_-]*`. The full string IS the sentinel; partial substitution (e.g. `prefix-@resolve:foo`) is NOT supported.

#### Scenario: Valid sentinel in config.register
- GIVEN a manifest `pages[2] = {type: "index", config: {register: "@resolve:theme_register"}}`
- WHEN the loader runs
- THEN `pages[2].config.register` MUST be replaced with the result of `getAppConfigValue(appId, 'theme_register')`

#### Scenario: Valid sentinel in nested config field
- GIVEN `pages[5] = {type: "settings", config: {sections: [{title: "x", saveEndpoint: "@resolve:settings_endpoint"}]}}`
- WHEN the loader runs
- THEN `pages[5].config.sections[0].saveEndpoint` MUST be substituted

#### Scenario: Partial sentinel is left intact
- GIVEN `pages[2].config.register = "prefix-@resolve:foo"`
- WHEN the loader runs
- THEN the value MUST be unchanged (only fully-matched sentinels resolve)

### Requirement: Sentinel substitution MUST run after merge, before validation

`useAppManifest()` MUST execute substitution between the bundled+backend-merge phase and the schema-validation phase, in this order:

1. Import bundled manifest (sync)
2. Async-fetch `/api/manifest` and deep-merge (silent fallback)
3. Run `resolveManifestSentinels(merged, appId)`
4. Run `validateManifest(resolved)`
5. Return `{ manifest, isLoading, validationErrors, unresolvedSentinels }`

The validator MUST NEVER observe an unresolved sentinel at runtime; build-time validation (`npm run check:manifest`) MAY observe sentinels and accepts them via the schema's permissive sentinel-pattern rule.

#### Scenario: Validator never sees sentinels at runtime
- GIVEN a manifest with `pages[0].config.register = "@resolve:my_register"`
- AND `IAppConfig.my_register = "actual-slug"`
- WHEN `useAppManifest()` returns
- THEN `manifest.pages[0].config.register === "actual-slug"`
- AND the validator MUST have run against `"actual-slug"`, NOT against the sentinel

### Requirement: Unresolved sentinels MUST resolve to `null` and emit a console warning

When `getAppConfigValue(appId, key)` returns `undefined`, `null`, or an empty string for the sentinel's key, the loader MUST: (a) replace the sentinel with `null` (explicitly null, NOT empty string); (b) emit `console.warn('Manifest sentinel ...resolved to null (key unset)')`; (c) include the key in the loader's returned `unresolvedSentinels` array.

#### Scenario: Unresolved sentinel becomes null
- GIVEN `pages[2].config.register = "@resolve:missing_register"`
- AND `getAppConfigValue('myApp', 'missing_register')` returns null
- WHEN the loader runs
- THEN `pages[2].config.register === null`
- AND `console.warn` MUST have been called once with `'missing_register'` in the message
- AND `unresolvedSentinels` returned from `useAppManifest()` MUST include `'missing_register'`

#### Scenario: Resolved sentinel is NOT in unresolvedSentinels
- GIVEN `pages[2].config.register = "@resolve:theme_register"`
- AND `getAppConfigValue('myApp', 'theme_register') === 'theme-2026'`
- WHEN the loader runs
- THEN `pages[2].config.register === 'theme-2026'`
- AND `unresolvedSentinels` MUST NOT include `'theme_register'`

### Requirement: Sentinels are NOT permitted in `route`, `id`, `component`, `version`, `dependencies`, `menu` paths

The schema validator MUST reject `@resolve:<key>` strings in: `pages[].route`, `pages[].id`, `pages[].component`, `pages[].headerComponent`, `pages[].actionsComponent`, `pages[].slots.*`, `menu[].route`, `menu[].id`, `version`, `dependencies[]`, `$schema`. These are router invariants or registry keys; dynamic resolution would break vue-router or the customComponents registry.

#### Scenario: Sentinel in route is rejected at build time
- GIVEN `pages[0] = {id: "x", route: "@resolve:my_route", type: "index"}`
- WHEN `validateManifest()` runs at build time
- THEN it MUST return `{ valid: false, errors: [...] }`
- AND the error path MUST be `pages[0].route`

#### Scenario: Sentinel in version is rejected
- GIVEN a manifest top-level `version = "@resolve:app_version"`
- WHEN `validateManifest()` runs
- THEN it MUST return `{ valid: false }` with error path `version`

### Requirement: The schema validator MUST permissively accept the sentinel pattern in `config` paths

For build-time validation runs (where sentinels haven't been substituted), the schema validator MUST accept any string matching `^@resolve:[a-z][a-z0-9_-]*$` as a valid value for any `string`-typed field under `pages[].config.*`, regardless of any narrower per-field constraint (e.g. UUID format).

#### Scenario: Sentinel passes UUID-shaped field validation
- GIVEN a schema where `pages[].config.register` is `string` with pattern `[a-z0-9-]{36}` (UUID)
- AND the manifest has `pages[0].config.register = "@resolve:my_register"`
- WHEN build-time `validateManifest()` runs
- THEN MUST return `{ valid: true }` (sentinel exempts the UUID pattern check)

### Requirement: `getAppConfigValue` MUST consult initialState first, fall back to a runtime fetch

The resolver MUST consult `@nextcloud/initial-state` for keys provisioned at server-render time (zero-network), then fall back to a `GET /index.php/apps/{appId}/api/configs/{key}` fetch with a 5-second cache. If neither resolves, return null.

#### Scenario: Initial-state hits avoid network
- GIVEN `@nextcloud/initial-state` has `app-myApp-theme_register = 'theme-2026'`
- WHEN the loader resolves `@resolve:theme_register`
- THEN it MUST return `'theme-2026'`
- AND it MUST NOT issue any `axios.get` call

#### Scenario: Runtime fetch caches per-(appId, key)
- GIVEN a manifest references `@resolve:theme_register` in 5 different pages
- AND `theme_register` is NOT in initialState
- WHEN the loader runs
- THEN exactly ONE `axios.get('/index.php/apps/myApp/api/configs/theme_register')` request MUST be issued
- AND all 5 references MUST receive the same resolved value

### Requirement: `useAppManifest()` MUST expose `unresolvedSentinels`

The composable's return MUST include a new field `unresolvedSentinels: string[]` listing every IAppConfig key that resolved to null/unset. Consumers MAY render an admin warning ("3 settings unconfigured") off this list.

#### Scenario: Loader returns unresolved key list
- GIVEN a manifest references `@resolve:foo` (set), `@resolve:bar` (unset), `@resolve:baz` (unset)
- WHEN `useAppManifest()` returns
- THEN `result.unresolvedSentinels` MUST be `['bar', 'baz']`
