# Manifest config $refs

## Why

The prior `manifest-config-defs` change added seven `$defs` to the
manifest schema (`column`, `action`, `widgetDef`, `layoutItem`,
`formField`, `sidebarSection`, `sidebarTab`) but kept them additive —
the page-type `config` blocks still have `additionalProperties: true`
and don't `$ref` the new shapes. The reasons were:

1. Avoid merge conflicts with the four sibling schema-touching
   changes (`manifest-page-type-extensions`, `manifest-abstract-sidebar`,
   `manifest-detail-sidebar-config`, `manifest-settings-rich-sections`)
   that were in flight at the same time.
2. Gather real-world usage data on the def shapes before locking down
   `$ref` wiring.

Both reasons are now resolved: all five sibling changes have merged
into `feature/manifest-v1`, the defs have been used by tests and
documented examples, and three apps (opencatalogi, decidesk, mydash)
have authored manifests using the documented shapes. Time to wire up
the refs.

## What Changes

Add `$ref` references from `pages[].config` sub-properties to the
seven `$defs` already in the schema. Replace each `additionalProperties:
true` block where a recurring sub-shape exists with a typed
`properties` block whose array items `$ref` the matching `$def`.

The full mapping table lives in `design.md` ("Mapping table"). The
short version:

| Path | Refs |
|---|---|
| `index.config.columns[]` | `oneOf: [string, $ref column]` (string = legacy shorthand) |
| `index.config.actions[]` | `$ref action` |
| `index.config.sidebar.columnGroups[]` | `$ref sidebarSection` |
| `detail.config.sidebar.tabs[]` | `$ref sidebarTab` |
| `detail.config.sidebarProps.tabs[]` | `$ref sidebarTab` |
| `dashboard.config.widgets[]` | `$ref widgetDef` |
| `dashboard.config.layout[]` | `$ref layoutItem` |
| `settings.config.sections[].fields[]` | `$ref formField` |

The mapping is intentionally **conservative** at the boundary: the
`pages[].config` outer block keeps `additionalProperties: true`
(consumer apps freely add per-app keys); only the recurring inner
shapes become typed. Detail's `config.sidebar` keeps its
`Boolean | Object` `oneOf` from `manifest-detail-sidebar-config`; only
the `tabs[]` sub-array becomes typed.

Bumps the schema's top-level `version` to `1.2.0` — this is a
**tightening** (non-breaking on documented manifests, but a meaningful
surface change). The `version` line was last touched by
`manifest-page-type-extensions` (1.1.0).

Mirrors the new schema strictness in `src/utils/validateManifest.js`
where it produces sharper, actionable error messages — specifically in
`validateTypeConfig`'s settings/dashboard paths. Where the FE
validator is already stricter than the schema (e.g. tab id uniqueness,
tabs widgets-OR-component mutual exclusion) it stays as-is; JSON
Schema can't easily express those.

## Problem

Without `$ref`s wired up:

- Field name drift goes undetected. opencatalogi names a column field
  `key` while a future app could write `field` — both pass
  `additionalProperties: true` but only one renders.
- Editor autocomplete doesn't trigger inside `config.columns[]` /
  `config.widgets[]` / etc. because the path isn't typed.
- CI Ajv validation in hydra (`ConductionNL/hydra#195`) sees the same
  free-form shape the FE does — schema-level enforcement is missing.
- App Builder (the future admin UI authoring manifests in a form) has
  no shape contract to render against.

## Proposed Solution

Wire up `$ref`s as the table above. Where the existing fixtures use a
shorthand form (e.g. `columns: ["title", "status"]` — array of
strings), add a `oneOf` to keep the shorthand valid alongside the
Object form. Document each shorthand explicitly in `design.md` and in
`docs/utilities/manifest-defs.md`.

Bump schema `version` to `1.2.0`.

Update `validateManifest` to mirror the new strictness where it
produces sharper error messages. Don't duplicate the schema's `$ref`
machinery — the FE validator stays narrow, sticking to runtime rules
that benefit from named-path messages (semver, page id uniqueness,
tab uniqueness, mutual exclusions).

Add `tests/schemas/app-manifest-refs.spec.js`. For each ref'd
property: assert a known-good fixture passes a `$ref`-resolving
structural validator AND a fixture missing a required field is
flagged.

Re-run every existing fixture in `tests/fixtures/` against
`validateManifest`. Every existing valid fixture MUST still validate
clean.

## Out of scope

- Tightening `pages[].config` from `additionalProperties: true` to
  `false` at the outer level. Consumer apps add per-app keys (e.g.
  `decisions-index` uses `register` + `schema` strings; future apps
  may add `audit` / `policy` / `cache` keys). Closing the outer level
  is a separate breaking change.
- Adding `$id`s to each `$def`. Consumers reach them via JSON-Pointer.
- Recursive shapes (nested tabs / nested widgets). Defer until a
  consumer surfaces the need.
- Tightening `widgetDef.props` / `column.formatter` / `action.icon` /
  similar open registry strings. Those stay open by design.

## See also

- `nextcloud-vue/openspec/changes/manifest-config-defs/` — predecessor
  that landed the seven `$defs` additively.
- `nextcloud-vue/openspec/changes/add-json-manifest-renderer/` —
  parent contract.
- Hydra ADR-024 (App manifest fleet-wide adoption).
