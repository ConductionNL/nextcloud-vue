# Design: Manifest dynamic per-tenant menu entries

## Context

The lib-side manifest renderer (`add-json-manifest-renderer`) ships
a synchronous bundled-load + async backend-merge flow in
`useAppManifest`. ADR-024 codifies the convention; the
`/api/manifest` endpoint is documented as opt-in. Lib v2 backlog
flags two related rows: "Dynamic per-tenant menu entries" and
"Backend `/api/manifest` endpoint implementation".

Opencatalogi is the first real consumer that needs dynamic per-tenant
menu fan-out. Its previous (pre-manifest) `MainMenu.vue` rendered
one nav entry per catalogue via `v-for="catalogus in catalogs"`. The
catalogues live in the OpenRegister `listing_register` and are
runtime-resolved.

## The two options

### Option A — backend populates `menu[]` (chosen)

The backend `/api/manifest` endpoint returns a partial manifest
whose `menu[]` is the resolved per-tenant list. The lib-side
loader's deep-merge replaces the bundled `menu[]` with the
backend-supplied one (arrays are replaced wholesale —
`useAppManifest.js` line 99–111).

Pros:
- **Zero new lib runtime code.** The capability already exists; the
  change is documentation + a fixture test that locks the contract.
- **Stays inside the manifest contract.** No new schema fields. The
  backend-supplied `menu[]` validates against the same `menuItem` /
  `menuItemLeaf` `$defs` the bundled one does.
- **Layer-clean.** The lib never imports register/schema concepts.
  Per ADR-022, apps consume OR via the backend; the manifest is the
  FE side of that principle.
- **i18n-aligned.** Backend ships translation keys (`menu.catalog.foo`),
  never formatted strings. Aligns with ADR-025 (i18n source of truth)
  and the existing `label` key contract.
- **Caching is the backend's concern.** OpCache, CDN, ETag — all the
  usual HTTP caching primitives apply. No client-side staleness
  invariants for the lib to manage.

Cons:
- Each app that wants dynamic menus must implement the endpoint. A
  backend stub that returns 404 is the path of least resistance for
  apps that don't.
- Tier-1 apps (those that consume only `useAppManifest` without the
  full shell) must still call the loader to pick up the backend
  merge — same as today.

### Option B — `dynamicSource` field on `menu[]` entries (rejected)

Add a new field to the `menuItem` schema:

```json
{
  "id": "catalogs",
  "label": "menu.catalogs",
  "dynamicSource": {
    "register": "listing_register",
    "schema": "listing_schema",
    "labelField": "title",
    "routeTemplate": "/catalogs/:slug"
  }
}
```

At boot, the loader fetches the register collection, expands each
row into a child `menuItemLeaf`, and substitutes them under the
parent entry's `children[]`.

Pros:
- Apps that don't have a backend `/api/manifest` endpoint still get
  dynamic menus.
- The expansion happens in one place (the lib), so every consumer
  gets identical semantics.

Cons:
- **The lib gains data-layer knowledge.** It must know what a
  "register" and a "schema" are, must know how to query
  `/index.php/apps/openregister/api/objects/{register}/{schema}`,
  must handle pagination, must handle auth context. ADR-022
  (apps consume OR abstractions) forbids this — the manifest
  is the FE expression of the same boundary.
- **Pairs badly with the `@resolve:` sentinel.** Sentinels resolve
  per-tenant `IAppConfig` keys into register slugs. Adding a
  parallel runtime-fetch mechanism creates two ways for a manifest
  to depend on per-tenant data. The sentinel runs once at load;
  `dynamicSource` would have to fetch on every reload, plus handle
  cache invalidation. Two systems to keep in sync.
- **Schema drift.** New fields like `labelField`, `routeTemplate`,
  `filterQuery`, `permission` accrete on `menuItem` over time. Each
  becomes a new validation rule, a new test surface, a new
  documentation entry. The schema's `additionalProperties: false`
  means every accretion is a versioned schema bump.
- **i18n weakens.** `labelField: "title"` pulls a free-text value
  from the register row and renders it directly. That value is
  stored once (typically in the source-of-record locale) and the
  app can't translate it without round-tripping through a
  translation service. Conflicts with ADR-025.
- **Shadow consumers.** A backend-only consumer of `/api/manifest`
  (admin UI, audit tool, deployment scanner) sees a manifest with a
  `dynamicSource` field but can't expand it — only the FE loader
  can. Two contracts diverge.

Net: Option B trades a real lib runtime cost (data-layer coupling,
schema growth, i18n erosion, two-system drift) for a marginal
convenience (apps don't have to ship a backend endpoint). Apps that
need dynamic menus already have backends; the marginal cost of
adding one endpoint is low.

## Decision: Option A

The backend populates `menu[]`. The lib documents the contract,
ships a fixture test, and updates the relevant docs pages.

If a future need surfaces that genuinely cannot be served by the
backend-merge path (e.g. a long-tail of small apps without backend
codebases), revisit. But the initial set of consumers
(opencatalogi, mydash, organisations-flavoured procest, possibly
softwarecatalog) all already have PHP backends and per-tenant
config; adding a `/api/manifest` controller is a 30-line lift per
app.

## What changes in the lib

- **Documentation** — extend `docs/utilities/composables/use-app-manifest.md`
  with a "Dynamic per-tenant menu entries" subsection. Document the
  backend response shape, the array-replace semantic, and the
  bundled-fallback expectation. Add a worked example based on the
  opencatalogi catalogue case.
- **Migration guide** — extend `docs/migrating-to-manifest.md`
  with a section on dynamic menus, pointing at the same content
  with consumer-flavour framing.
- **CnAppNav docs** — add a one-line note under CnAppNav's
  reference docs that the menu it renders is whatever
  `useAppManifest` ultimately resolves to, and a link to the
  dynamic-menu pattern.
- **Fixture test** — add a test to `useAppManifest.spec.js` that
  loads a bundled manifest with a placeholder menu entry, mocks a
  backend response that supplies a fully resolved `menu[]` with
  children, and asserts the merged manifest contains the resolved
  list.
- **No schema change.** The `menuItem` / `menuItemLeaf` `$defs`
  already permit the resolved shape.
- **No runtime change in `useAppManifest.js`.** The behaviour is
  already correct; we only lock it under tests and docs.

## i18n

The backend supplies `label` as a translation key (e.g.
`menu.catalog.foo`), never as a formatted string. The consumer
app's `t()` resolves the key against its locale catalogue at render
time. If a per-tenant catalogue label needs to be free-text (e.g.
"Customer's vendor catalogue"), the backend ships an i18n
translation key indirection: the backend persists `{ slug: "foo",
labelKey: "menu.catalog.foo" }`, the i18n catalogue holds the
mapping, and runtime translation works without a server round-trip.
For purely free-text labels with no translation, an opt-out path
(label as literal string with a sentinel like `@literal:` or an
explicit `labelKind` field) is **out of scope** — revisit if
consumer evidence emerges.

## Validation

- Backend MUST return menu items conforming to `menuItem` /
  `menuItemLeaf` `$defs` — same fields, same constraints, same
  one-level nesting limit.
- The schema validator runs on the merged manifest, so a malformed
  backend response triggers the existing fallback path (validation
  fails → bundled manifest stays in place, `validationErrors` is
  set, `console.warn` fires).
- The bundled manifest SHOULD include a placeholder menu entry so
  the bundled-only path validates and renders something coherent
  before the backend response arrives.

## Backend contract (informative)

The backend implementation of `/api/manifest` is per-app, but the
contract is shared. Consumers SHOULD:

- Resolve dynamic data from their own services / repositories
  (catalogues from `listing_register`, organisations from the org
  table, etc.).
- Build the `menu[]` array as plain objects matching the schema.
- Sort by `order` if applicable, or rely on the consumer rendering
  order.
- Set `route` to a valid `pages[].id` so navigation works.
- Set `label` to a translation key.
- Return the partial manifest as JSON with `Content-Type:
  application/json`.

A reference PHP shape (informative, not normative — each app's
backend ships its own controller):

```php
return new JSONResponse([
    'menu' => array_merge(
        $this->bundledMenu(), // static entries
        array_map(fn($c) => [
            'id' => 'catalog-' . $c->getSlug(),
            'label' => 'menu.catalog.' . $c->getSlug(),
            'route' => 'catalog-detail',
            'icon' => 'icon-folder',
        ], $this->catalogService->all()),
    ),
]);
```

The bundled manifest's `menu[]` includes a placeholder entry
(typically the parent under which the dynamic children render);
the backend either supplies the complete replacement list or
omits `menu[]` entirely, in which case the bundled list survives.

## Risks

- **Opencatalogi adopts the pattern incorrectly** — risk mitigated
  by the documentation update and a worked example. The
  manifest-dynamic-menu spec.md scenarios provide a contract test
  the consumer's adoption can mirror.
- **Future apps want partial fan-out (some bundled + some
  dynamic)** — addressed by the documented "merge in your
  controller" pattern. Backend assembles full resolved list. No
  new lib mechanic.
- **i18n tax for new dynamic entries** — apps with truly
  free-text labels need a follow-up sentinel (`@literal:` or
  `labelKind`). Revisit if evidence emerges; meanwhile, key-based
  i18n is the documented path.
