# resolveManifestSentinels

Pure utility that walks an assembled manifest and replaces every `@resolve:<key>` sentinel under `pages[].config` with the consuming app's `IAppConfig` value for `<key>`. Backs the [`manifest-resolve-sentinel` capability](../../openspec/changes/manifest-resolve-sentinel/specs/manifest-resolve-sentinel/spec.md) and is invoked automatically by [`useAppManifest`](./composables/use-app-manifest.md) between the bundled+backend-merge phase and validation.

Most consumers do **not** call this directly — `useAppManifest` already wires it up. The utility is exported so advanced consumers (e.g. CLI manifest checkers, custom loaders, fixture-driven tests) can run the same substitution out-of-band.

## Why a sentinel

Many consuming apps ship a `pages[].config.register` / `config.schema` value that is configured per-tenant via `IAppConfig` (e.g. `theme_register`, `listing_schema`, `voorzieningen_register`). Hardcoding the slug defeats per-tenant configurability; reading it client-side defeats the manifest's static-validation property. The `@resolve:<key>` sentinel keeps the manifest static at build time and resolves the slug at load time.

## Sentinel syntax

```
@resolve:<key>
```

- `<key>` matches `[a-z][a-z0-9_-]*` — IAppConfig keys are lowercase alphanumeric with `_` / `-`.
- The full string IS the sentinel. `prefix-@resolve:foo` is a plain string and is left alone (no partial substitution).

## Where the sentinel is allowed

| Location | Sentinel allowed? |
|----------|-------------------|
| `pages[].config.*` (any string-typed field at any depth) | Yes — substituted at load time. |
| `pages[].id`, `pages[].route`, `pages[].component`, `pages[].headerComponent`, `pages[].actionsComponent`, `pages[].slots.*` | No — rejected by `validateManifest` (router / registry invariants). |
| `menu[].id`, `menu[].route` | No — same. |
| `version`, `dependencies[]`, `$schema` | No — top-level invariants. |

The validator emits a clear error path when a sentinel appears outside `pages[].config`.

## Signature

```js
import { resolveManifestSentinels } from '@conduction/nextcloud-vue'

const { manifest, unresolved } = await resolveManifestSentinels(merged, appId, options)
```

| Argument | Type | Description |
|----------|------|-------------|
| `merged` | `object` | Assembled manifest (typically the deep-merge of bundled + backend). The input is **not** mutated. |
| `appId` | `string` | Nextcloud app ID. Scopes the IAppConfig namespace. |
| `options.getAppConfigValue` | `Function` | Optional. `(appId, key) => Promise<value\|null>` resolver. Defaults to `initial-state-then-fetch`. Override for tests. |
| `options.warn` | `Function` | Optional. Override for `console.warn`. Useful in tests to capture warning calls. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `manifest` | `object` | A NEW manifest object with sentinels substituted. The input is unchanged. |
| `unresolved` | `string[]` | List of IAppConfig keys whose sentinel resolved to `null` (unset / empty / fetch failure). Surfaces on `useAppManifest`'s `unresolvedSentinels` ref. |

## Resolution source chain

For each unique `(appId, key)` the resolver consults sources in order, stopping on the first non-null hit:

1. **`@nextcloud/initial-state` slot `app-{appId}-{key}`** — zero-network. Use this when the server-side renderer provisions the value via `IInitialState::provideInitialState()`.
2. **`GET /index.php/apps/{appId}/api/configs/{key}`** — runtime fetch. The response body may be a raw scalar or `{ value: ... }`; both shapes are handled.
3. **`null`** — unresolved. The sentinel substitutes `null` (NOT empty string) so downstream renderers can short-circuit to a "not configured" empty state cleanly.

Each `(appId, key)` is fetched at most once per page lifetime (the cache is process-wide; admin changes to IAppConfig do not auto-propagate, consistent with the manifest's load-once model).

## Empty-state semantics

When a key resolves to `undefined`, `null`, or `''`:

- The sentinel becomes `null` (NOT `''`). Empty-string semantics break — a register slug `''` is not a valid OR slug, but a fetch with `''` would 404 noisily; `null` causes the renderer to short-circuit cleanly.
- A `console.warn` is emitted: `[resolveManifestSentinels] Manifest sentinel '@resolve:foo_register' resolved to null (key unset)`.
- The key is added to the returned `unresolved` array.

## Usage

### Standalone

```js
import { resolveManifestSentinels } from '@conduction/nextcloud-vue'
import bundledManifest from './manifest.json'

const { manifest, unresolved } = await resolveManifestSentinels(bundledManifest, 'softwarecatalog')

if (unresolved.length > 0) {
  console.warn(`${unresolved.length} settings unconfigured:`, unresolved)
}
```

### Test fixture

```js
import { resolveManifestSentinels, clearResolveCache } from '@conduction/nextcloud-vue'

beforeEach(() => clearResolveCache())

it('substitutes @resolve:theme_register', async () => {
  const fixture = {
    version: '1.0.0',
    menu: [],
    pages: [
      { id: 'home', route: '/', type: 'index', title: 't', config: { register: '@resolve:theme_register' } },
    ],
  }
  const { manifest } = await resolveManifestSentinels(fixture, 'myapp', {
    getAppConfigValue: async (_, key) => ({ theme_register: 'theme-2026' })[key],
  })
  expect(manifest.pages[0].config.register).toBe('theme-2026')
})
```

## See also

- [useAppManifest](./composables/use-app-manifest.md) — Primary consumer; calls this utility automatically.
- [validateManifest](./validate-manifest.md) — Rejects sentinels in non-`config` paths.
- [`manifest-resolve-sentinel` spec](../../openspec/changes/manifest-resolve-sentinel/specs/manifest-resolve-sentinel/spec.md) — The capability requirements.
