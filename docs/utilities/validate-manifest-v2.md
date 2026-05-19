# validateManifestV2

Validate a v2 Conduction app manifest against the v2 JSON Schema. Uses **Ajv** (`ajv` + `ajv-formats`) against `src/schemas/app-manifest-v2.schema.json` and adds runtime post-checks the schema cannot express (cross-field arithmetic, `$id` uniqueness, `@resolve:` sentinel path rejection).

The v1 validator (`validateManifest`) stays hand-rolled for backward compatibility. The two coexist behind the `$schema` dispatch in `validateManifest()` — most consumers just call `validateManifest(manifest)` and get the correct path automatically.

## Signature

```js
import { validateManifestV2 } from '@conduction/nextcloud-vue'

const { valid, errors } = validateManifestV2(manifest)
```

| Argument | Type | Description |
|----------|------|-------------|
| `manifest` | `object` | The v2 manifest object to validate. MUST declare a `$schema` field pointing to the v2 schema URL (the dispatcher in `validateManifest()` enforces this; calling `validateManifestV2` directly skips the dispatch). |

## Return value

| Key | Type | Description |
|-----|------|-------------|
| `valid` | `boolean` | `true` when `errors` is empty. |
| `errors` | `string[]` | Bracket-path error messages matching the v1 validator's format, e.g. `'/pages/0/widgets/2: gridX + gridWidth (8 + 6 = 14) exceeds 12 for slot "body"'`. |

## Rules enforced

**Schema-level (via Ajv, see [`app-manifest-v2.schema.json`](https://github.com/ConductionNL/nextcloud-vue/blob/main/src/schemas/app-manifest-v2.schema.json)):**

- `$schema`, `version`, `menu`, `pages` are required at the top level.
- `version` matches the semver pattern.
- `pages[].type` is one of the 11 closed-enum values: `index | detail | dashboard | logs | settings | chat | files | form | wiki | map | custom`.
- `pages[].widgets[]` (when present) entries follow the unified `widgetEntry` shape: `widgetKey`, `slot`, `gridX`, `gridY`, `gridWidth`, `gridHeight`, optional `props`, `tabGroup`, `dataSource`, `_note`.
- `slot` is either one of `body | sidebar | header-actions | footer | modal` or matches the pattern `^(tab|section):.+`.
- Per-slot grid constraints: `sidebar` requires `gridWidth: 1`; `header-actions` requires `gridY: 0`.
- `pages[].actions[]` (when present) entries have a `type` field in `handler | open-modal | open-page | navigate`. Missing `type` defaults to `handler` (via Ajv `useDefaults: true`, preserving v1.3.0 backward compatibility).
- `type: "custom"` pages MUST include a `_note` field documenting why decomposition was not feasible.
- All v1.3.0 features carry forward unchanged in the schema (`dataSource`, `@resolve:` sentinels, dynamic menus, named-view sidebar, `cardComponent`, settings `tabs[]`, `runtime`, `dependencies`).

**Post-schema (runtime checks):**

- `pages[].id` MUST be unique across the array.
- For every `widgets[]` entry: `gridX + gridWidth ≤ 12` (only enforced on 12-column slots — `body`, `header-actions`, `footer`, `modal`, `tab:*`, `section:*`).
- `@resolve:<key>` sentinels are REJECTED on registry-key and router-invariant paths: `pages[].id`, `pages[].route`, `pages[].component`, `pages[].headerComponent`, `pages[].actionsComponent`, `pages[].slots.*`, `menu[].id`, `menu[].route`, `dependencies[]`, `version`. Mirrors v1's behaviour.

## Dispatch contract

`validateManifest()` reads `manifest.$schema`:

- ends with `/app-manifest-v2.schema.json` → calls `validateManifestV2()`
- absent or matches v1 URL → existing v1 path
- present but matches neither → falls back to v1 + `console.warn` once per module load

Consumers should call `validateManifest()` in most cases. `validateManifestV2()` is exported for explicit v2-only paths (e.g., the codemod CLI, the hydra `gate-manifest-validates` gate).

## See also

- [validateManifest](./validate-manifest.md) — v1 hand-rolled validator
- [useAppManifest](../composables/use-app-manifest.md) — wraps `validateManifest()` for reactive use in components
- [ADR-036 in hydra](https://github.com/ConductionNL/hydra/blob/development/openspec/architecture/adr-036-universal-widget-manifest.md) — v2 design rationale
- [docs/architecture/manifest.md](../architecture/manifest.md) — manifest authoring overview (v1 + v2)
