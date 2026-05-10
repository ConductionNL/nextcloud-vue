---
status: draft
---
# Manifest dynamic per-tenant menu entries

## Purpose

Canonicalise the **backend-populated `menu[]`** pattern as the
mechanism for dynamic per-tenant menu entries in
`@conduction/nextcloud-vue`. Pairs with ADR-024 lib v2 backlog
rows "Dynamic per-tenant menu entries" and "Backend
`/api/manifest` endpoint implementation"; collapses the two into a
single resolution.

## ADDED Requirements

### Requirement: Backend `/api/manifest` MAY supply a fully-resolved `menu[]` that REPLACES the bundled menu

The backend manifest endpoint (`GET /index.php/apps/{appId}/api/manifest`) MAY return a partial manifest whose top-level `menu` field is a complete resolved list including any per-tenant dynamic entries. When the response status is 200 and the body contains a `menu` key, `useAppManifest` MUST replace the bundled `menu[]` with the backend-supplied array (consistent with the array-replacement deep-merge semantic the loader already documents).

#### Scenario: Backend supplies a menu with three resolved catalogues

- GIVEN a bundled manifest with `menu = [{ id: "catalogs", label: "menu.catalogs", route: "catalogs" }]`
- AND a backend `/api/manifest` response of `{ menu: [{ id: "catalogs", label: "menu.catalogs", children: [{ id: "catalog-a", label: "menu.catalog.a", route: "catalog-detail" }, { id: "catalog-b", label: "menu.catalog.b", route: "catalog-detail" }, { id: "catalog-c", label: "menu.catalog.c", route: "catalog-detail" }] }] }`
- WHEN `useAppManifest` resolves
- THEN `manifest.menu[0].children` MUST contain three entries with ids `catalog-a`, `catalog-b`, `catalog-c`
- AND `manifest.menu[0].id` MUST remain `catalogs`

#### Scenario: Backend supplies a flat list of resolved entries (no children)

- GIVEN a bundled manifest with `menu = [{ id: "placeholder", label: "menu.placeholder" }]`
- AND a backend response of `{ menu: [{ id: "org-1", label: "menu.org.1", route: "org-detail" }, { id: "org-2", label: "menu.org.2", route: "org-detail" }] }`
- WHEN `useAppManifest` resolves
- THEN `manifest.menu` MUST be the two-entry resolved list — the bundled placeholder MUST NOT survive (arrays are replaced, not concatenated)

### Requirement: Backend-supplied menu items MUST validate against the same `menuItem` / `menuItemLeaf` `$defs` as bundled items

The schema's `menuItem` / `menuItemLeaf` definitions are the canonical contract for both bundled and backend-supplied entries. Backend responses are not granted any schema relaxation. Validation runs on the merged manifest, so a backend response carrying a malformed `menu[]` triggers the existing fallback path (REQ-JMR-002 silent-fallback on validation failure: bundled manifest stays in place, `validationErrors` is set, `console.warn` is logged).

#### Scenario: Backend menu item missing `id` triggers fallback

- GIVEN a bundled manifest that validates
- AND a backend response with `menu = [{ label: "broken" }]` (no `id`)
- WHEN `useAppManifest` resolves
- THEN `manifest.value` MUST equal the bundled manifest (unchanged)
- AND `validationErrors.value` MUST be non-null
- AND a `console.warn` MUST have been emitted

#### Scenario: Backend menu item with `additionalProperties` triggers fallback

- GIVEN a backend response with `menu = [{ id: "x", label: "x", customField: 1 }]`
- WHEN `useAppManifest` resolves
- THEN validation MUST fail (the `menuItem` `$def` declares `additionalProperties: false`)
- AND the bundled manifest MUST be retained

### Requirement: Bundled manifest SHOULD include a placeholder menu entry to validate without the backend

To preserve the bundled-only Tier-1 path (REQ-JMR-002 silent-fallback for apps that have not yet implemented `/api/manifest`), the bundled `manifest.json` SHOULD include the static placeholder menu entries that the backend later replaces. A bundled manifest with `menu: []` is permitted by the schema but discouraged; an empty menu renders an empty `CnAppNav`, which is a degraded but functional state.

#### Scenario: Bundled placeholder survives when backend returns 404

- GIVEN a bundled manifest with `menu = [{ id: "catalogs", label: "menu.catalogs", route: "catalogs" }]`
- AND the backend `/api/manifest` returns a 404 status
- WHEN `useAppManifest` resolves
- THEN `manifest.menu` MUST equal the bundled `menu` (one placeholder entry)
- AND `validationErrors.value` MUST be `null`

### Requirement: Backend-supplied `label` values MUST be i18n translation keys, never formatted strings

ADR-025 (i18n source-of-truth) constrains all `label` and `title` values in the manifest to be translation keys consumed by the consuming app's `t()` function. This requirement applies equally to backend-populated menu entries: the backend MUST emit translation keys, not localized strings. Per-tenant dynamic labels (e.g. catalogue titles) MUST be expressed as keys; the consuming app's locale catalogue resolves them. A free-text label path (e.g. an `@literal:` sentinel or a `labelKind` field) is NOT part of this change and is NOT supported.

#### Scenario: Backend ships a translation key for a catalogue label

- GIVEN a backend response with `menu = [{ id: "catalog-foo", label: "menu.catalog.foo", route: "catalog-detail" }]`
- WHEN the consumer's `CnAppNav` renders the entry
- THEN the consumer's `t('opencatalogi', 'menu.catalog.foo')` resolves the key against the locale catalogue
- AND the rendered label is the localized string

### Requirement: The lib MUST NOT introduce a runtime fetcher for register/schema data

The lib stays at the manifest layer. It MUST NOT add any code path that directly queries a register, a schema, or an OpenRegister endpoint to expand a menu entry. Per ADR-022 (apps consume OR abstractions), the data-layer fan-out is the responsibility of the consuming app's backend, exposed via `/api/manifest`. A future schema field that encodes a register/schema reference for runtime expansion (the rejected "Option B" in the design) MUST NOT be introduced by this change.

#### Scenario: A `dynamicSource` field is rejected at build time by the schema validator

- GIVEN a build-time `npm run check:manifest` over a bundled manifest with `menu = [{ id: "x", label: "menu.x", dynamicSource: { register: "r", schema: "s" } }]`
- WHEN the Ajv schema validator runs the manifest against the canonical schema
- THEN validation MUST fail (the `menuItem` `$def` declares `additionalProperties: false`, so `dynamicSource` is rejected)
- AND CI MUST fail before the manifest reaches a release build

#### Scenario: An unexpected backend field passes through the runtime FE validator

- GIVEN a backend response carrying an unknown menu-item field (e.g. a misconfigured `dynamicSource`)
- WHEN `useAppManifest` resolves on the FE
- THEN the runtime FE validator (which is intentionally narrower than the Ajv schema validator) MUST NOT crash; the unknown field is preserved on the merged manifest
- AND the renderer ignores unknown fields it does not understand
- AND the build-time `npm run check:manifest` step (per ADR-024.5) is the canonical gate for `additionalProperties: false`, not the runtime validator

## Cross-references

- Pairs with ADR-024 lib v2 backlog: "Dynamic per-tenant menu
  entries" + "Backend `/api/manifest` endpoint implementation".
- Aligns with ADR-022 (apps consume OR abstractions): the lib does
  not query registers; the backend does.
- Aligns with ADR-025 (i18n source-of-truth): backend ships
  translation keys, not strings.
- Builds on `add-json-manifest-renderer` REQ-JMR-002 (three-phase
  bundled + backend-merge + validate flow).
- The opencatalogi consumer adoption lives in a separate change
  (`opencatalogi-adopt-manifest`); this change only documents and
  tests the lib-side contract.
