# Tasks: manifest-card-index-component

## Phase 1 — Schema

- [x] Update `src/schemas/app-manifest.schema.json`:
  - In the `pages[].config` `description`, document the new
    `cardComponent` field on the `type:"index"` shape.
  - Bump `version` from `1.2.x` to `1.3.0`.
  - Keep `additionalProperties: true` on the outer config block —
    no new explicit property entry is required because the field
    is documentation-only at the schema-validator level.

## Phase 2 — Component

- [x] Add a `cardComponent` prop to `CnIndexPage` (string, default
      empty), documented with a JSDoc comment that names the
      `customComponents` registry.
- [x] Add an opt-in `customComponents` prop to `CnIndexPage` (object,
      default null) for unit-test wiring without `CnAppRoot`.
- [x] Add `inject` for `cnCustomComponents` with a `default: () => ({})`
      so the page works when mounted standalone.
- [x] Add an `effectiveCustomComponents` computed that prefers the
      explicit prop and falls back to inject.
- [x] Add a `resolvedCardComponent` computed that returns the
      resolved component when `cardComponent` is non-empty AND the
      registry holds the name, `null` otherwise. Logs a
      `console.warn` for an unresolved non-empty name.
- [x] In the card-view branch, when no `#card` scoped slot is
      provided AND `resolvedCardComponent` is non-null, render a
      custom `#card` template inside `<CnCardGrid>` mounting
      `<component :is="resolvedCardComponent" :item :object :schema
      :register :selected @click @select>`.
- [x] Preserve existing behaviour:
  - `#card` scoped slot continues to take precedence.
  - When `cardComponent` is empty, `CnCardGrid` falls back to
    `CnObjectCard` exactly as today.
- [x] Read `register` from existing `register` prop / inject path
      (whichever the page already uses) so the resolved card
      component can match the schema → register pair.

## Phase 3 — Tests

- [x] Add `tests/components/CnIndexPageCardComponent.spec.js`:
  - Renders default `CnObjectCard` when `cardComponent` is unset.
  - Renders the registry-resolved component when `cardComponent`
    is set and `customComponents` has the name.
  - Logs `console.warn` and falls back to default when the name
    is unknown.
  - Honours the `#card` scoped slot precedence over `cardComponent`.
  - Forwards `item`, `schema`, `selected` props and the `click`
    + `select` events.
- [x] Extend an existing manifest schema fixture test to validate a
      manifest using `type:"index"` + `config.cardComponent` against
      the bumped schema (no error).

## Phase 4 — Docs

- [x] Update `src/components/CnIndexPage/CnIndexPage.md` with the
      new `cardComponent` prop entry and a worked manifest +
      `customComponents` example.
- [x] Update `src/components/CnAppRoot/CnAppRoot.md` to add a row
      under `customComponents` clarifying it now also resolves
      index card components for `type:"index"`.

## Phase 5 — Release prep

- [x] `npm test` green.
- [x] `npm run check:docs` green (or equivalent check the lib runs).
- [x] Schema validator fixture update in `tests/schemas/`
      (if applicable) — add a fixture with `cardComponent` and
      assert it validates.
