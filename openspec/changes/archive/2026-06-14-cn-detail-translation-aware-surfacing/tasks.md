# Tasks: CnDetail Translation-Aware Surfacing

## Phase 1 — Component

- [x] Add `src/components/CnTranslatedBadge/CnTranslatedBadge.vue` —
      stateless presentational component with `:object` and
      `:locale-name-formatter` props. Renders nothing when
      `_translationMeta.translatedFrom` is null / absent.
- [x] Add `src/components/CnTranslatedBadge/index.js` barrel.
- [x] Export `CnTranslatedBadge` from
      `src/components/index.js`.
- [x] Re-export `CnTranslatedBadge` from `src/index.js`.

## Phase 2 — CnDetailGrid wiring

- [x] Add optional `:object` prop to
      `src/components/CnDetailGrid/CnDetailGrid.vue`.
- [x] Render `<CnTranslatedBadge :object="object" />` in a new
      `cn-detail-grid__translation-header` block above the items,
      gated by `v-if="object"`. The badge auto-hides itself when
      `_translationMeta.translatedFrom` is null.

## Phase 3 — CnDetailPage wiring

- [x] Add a `resolvedObject` computed in
      `src/components/CnDetailPage/CnDetailPage.vue` that reads the
      bound store's `getObject(objectType, objectId)` getter when
      both props are non-empty.
- [x] Render `<CnTranslatedBadge :object="resolvedObject" />` in
      the header text block, between title and description, via a
      new `#translation-badge` slot defaulting to the badge.

## Phase 4 — Tests

- [x] Add `src/components/CnTranslatedBadge/__tests__/CnTranslatedBadge.spec.js`
      covering 5+ cases:
      no object, missing meta, translatedFrom null,
      translatedFrom non-empty (renders badge),
      localeNameFormatter prop honoured,
      translatedAt flows into title attribute.
- [x] Add `tests/components/CnDetailGridTranslation.spec.js`
      covering: `object` prop with `_translationMeta.translatedFrom`
      set → badge in DOM; `object` prop with null translatedFrom →
      no badge; no `object` prop → no header block.
- [x] Add `tests/components/CnDetailPageTranslationBadge.spec.js`
      covering: page with resolved translated object → badge in DOM;
      page with resolved source object → no badge; consumer-supplied
      `#translation-badge` slot wins.

## Phase 5 — Documentation

- [x] Add `docs/components/cn-translated-badge.md` matching the
      format of `docs/components/cn-detail-grid.md`.
- [x] Update `docs/components/cn-detail-grid.md` with the new
      `:object` prop + badge note.
- [x] Update `docs/components/cn-detail-page.md` with the
      `#translation-badge` slot + auto-render note.

## Phase 6 — Validation

- [x] `npx openspec validate cn-detail-translation-aware-surfacing --strict`
      passes.
- [x] `npm run build` succeeds (badge component exports cleanly,
      no CSS warnings, no tree-shake regressions).
- [x] `npm test -- tests/components/CnTranslatedBadge.spec.js
       tests/components/CnDetailGridTranslation.spec.js
       tests/components/CnDetailPageTranslationBadge.spec.js
       tests/components/CnDetailGrid.spec.js` passes.
