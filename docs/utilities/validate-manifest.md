# validateManifest

Validate a Conduction app manifest object against the manifest JSON Schema. Hand-rolled minimal validator covering the rules required by REQ-JMR-001 of the json-manifest-renderer spec; the same validator runs at runtime inside [`useAppManifest`](./composables/use-app-manifest.md).

The richer schema constraints (`additionalProperties: false`, URI `format`, etc.) are enforced by the BE / hydra CI validators that consume the same schema file with Ajv. The FE validator is intentionally narrow so a FE-only failure produces tight, actionable messages.

## Signature

```js
import { validateManifest } from '@conduction/nextcloud-vue'

const { valid, errors } = validateManifest(manifest, options)
```

| Argument | Type | Description |
|----------|------|-------------|
| `manifest` | `object` | The manifest object to validate. |
| `options.allowedTypes` | `Array<string>` | Optional. When provided, restricts allowed `pages[].type` values to this list (plus `'custom'`, which is always allowed). Useful in CI / build-time checks where the consumer's full `pageTypes` registry is known up front. When omitted, any non-empty string is accepted; the runtime renderer logs a warning for unknown types. |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `valid` | `boolean` | `true` when `errors` is empty. |
| `errors` | `string[]` | JSON-pointer-style messages, e.g. `'/pages/2/id "settings" must be unique within pages[]'`. |

## Rules enforced

- Top-level `version`, `menu`, `pages` are **required**.
- `version` matches the semver pattern `^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$`.
- `menu` is an array. Each item must be an object with a string `id` and string `label`. `children` (when present) must be an array.
- `pages` is an array. Each entry is an object with:
  - string `id` — unique across `pages[]`,
  - string `route`,
  - string `title`,
  - non-empty string `type`. When `options.allowedTypes` is set, `type` must be in `[...allowedTypes, 'custom']`,
  - string `component` is **required** when `type === 'custom'`.
- `dependencies` (when present) is an array of strings.

Whether a `type` value resolves to a real component is checked by [`CnPageRenderer`](../components/cn-page-renderer.md) at render time against the consumer-resolved `pageTypes` map; the validator cannot enforce that without the runtime registry.

## Usage

### Build-time check

```js
import { validateManifest } from '@conduction/nextcloud-vue'
import manifest from './src/manifest.json'

const { valid, errors } = validateManifest(manifest, {
  allowedTypes: ['index', 'detail', 'dashboard', 'report'],
})
if (!valid) {
  console.error('Invalid manifest:', errors)
  process.exit(1)
}
```

### Inside test fixtures

```js
import { validateManifest } from '@conduction/nextcloud-vue'

it('rejects pages with duplicate ids', () => {
  const manifest = {
    version: '1.0.0',
    menu: [],
    pages: [
      { id: 'a', route: '/a', title: 'A', type: 'index' },
      { id: 'a', route: '/b', title: 'B', type: 'index' },
    ],
  }
  const { valid, errors } = validateManifest(manifest)
  expect(valid).toBe(false)
  expect(errors[0]).toContain('must be unique')
})
```

## Related

- [useAppManifest](./composables/use-app-manifest.md) — Calls this validator on the merged manifest after the backend fetch.
- [defaultPageTypes](./default-page-types.md) — The registry whose keys you typically pass as `allowedTypes`.
- `src/schemas/app-manifest.schema.json` — The full JSON Schema (consumed by Ajv-based validators in BE / CI).
