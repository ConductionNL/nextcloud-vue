# Tasks: i18n Language Negotiation Getters

## Phase 1 — Headers helper

- [x] Extend `src/utils/headers.js::buildHeaders()` to accept an
      optional `targetLanguage: string` option. When present, append
      `X-Translation-Target-Language: <value>` to the returned headers
      object. When omitted, null, undefined, or empty the header MUST be
      absent (no header stamped).

## Phase 2 — Store factory + resolvers

- [x] Extend `src/store/useObjectStore.js::createObjectStore()` to
      accept `languageGetter: () => string | null` and
      `targetLanguageGetter: () => string | null` in its options
      object. Default both to `null`.
- [x] Thread the two getters through `defineObjectStore`'s
      `extraOptions` into `_options.languageGetter` and
      `_options.targetLanguageGetter` (same pattern as
      `organisationUuidGetter`).
- [x] Add `_resolveLanguage()` and `_resolveTargetLanguage()` base
      actions mirroring `_resolveOrganisationUuid()` — tolerant of
      throwing getters, null/empty returns mapped to `null`.

## Phase 3 — URL + header stamping

- [x] Update `_buildUrl(type, id)` to append `?_lang=<value>` (via
      `buildQueryString({ _lang })`) when `_resolveLanguage()` returns
      a non-empty string.
- [x] Update `_buildHeaders(contentType)` to pass `targetLanguage:
      _resolveTargetLanguage() || undefined` into `buildHeaders()` so
      the header is stamped on every plugin-routed request.
- [x] Reconcile the `_buildUrl(type) + buildQueryString(params)`
      concatenation site in `fetchCollection` so `_lang` is stamped
      exactly once when extra params are present.

## Phase 4 — Tests

- [x] Add `tests/store/i18nNegotiation.spec.js` covering:
      - `languageGetter` returning `'nl'` → fetched URL contains
        `?_lang=nl` (list + single).
      - `languageGetter` returning `null` → URL has no `_lang`.
      - `languageGetter` returning `''` → URL has no `_lang`.
      - `languageGetter` throwing → URL has no `_lang`.
      - `targetLanguageGetter` returning `'en'` → write request
        carries `X-Translation-Target-Language: en` on POST and PUT.
      - `targetLanguageGetter` returning `null` → header absent on
        write.
      - Both getters set → URL has `_lang` AND write header is stamped.
      - Composes with `organisationUuidGetter` — all three headers
        present together when configured.
      - Plugins inherit — a plugin issuing a write via
        `this._buildHeaders()` stamps the target-language header.

## Phase 5 — Documentation

- [x] Add `docs/composables/use-object-store.md` covering the two
      getters with a minimal usage example.
- [x] Update `docs/store/object-store.md` factory-options table with
      `languageGetter` and `targetLanguageGetter` rows.
- [x] JSDoc on `createObjectStore` mentions the two new options and
      points at the OR contracts they consume
      (`i18n-api-language-negotiation`, `i18n-source-of-truth`).

## Phase 6 — Validation

- [x] `npx openspec validate i18n-language-negotiation-getters --strict`
      passes.
- [x] `npm run build` succeeds.
- [x] `npm test -- tests/store/i18nNegotiation.spec.js
       tests/store/multiTenancy.spec.js tests/utils/` passes
      (multi-tenancy suite stays green — no regression on the sibling
      pattern).
