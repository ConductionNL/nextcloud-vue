# Design: i18n Language Negotiation Getters

## Reuse analysis

- `src/utils/headers.js::buildHeaders()` already supports an
  options-object signature with `organisationUuid` (multi-tenancy).
  We extend the same options object with `targetLanguage` rather
  than introducing a parallel header builder.
- `src/utils/headers.js::buildQueryString()` already serialises
  read-side query parameters with PHP-bracket array semantics. We
  reuse it for `_lang` — the same builder, just an extra entry in
  the params object.
- `src/store/useObjectStore.js` already centralises every read URL
  through `_buildUrl()` and every header bag through
  `_buildHeaders()`. Plugins (files, audit, relations, …) route
  through these same helpers — extending the helpers, not the
  callsites, means plugins inherit the new behaviour for free.
- The `organisationUuidGetter` pattern in `createObjectStore()` is
  the canonical "factory option + tolerant resolver" shape. We
  mirror it exactly so the two getters compose with it.

## Factory option contract

```js
// src/store/useObjectStore.js
export function createObjectStore(storeId, options = {}) {
    return defineObjectStore(
        storeId,
        options.plugins || [],
        options.baseUrl || prefixUrl(DEFAULT_BASE_URL),
        {
            organisationUuidGetter: options.organisationUuidGetter || null,
            languageGetter:        options.languageGetter        || null,
            targetLanguageGetter:  options.targetLanguageGetter  || null,
        },
    )
}
```

Default value is `null` for both. The factory's `defineObjectStore`
helper threads the values into the store's `_options` bag so the
two resolvers (`_resolveLanguage()` and `_resolveTargetLanguage()`)
can read them at request time.

## Resolver contract

```js
// inside baseActions
_resolveLanguage() {
    const getter = this._options.languageGetter
    if (typeof getter !== 'function') return null
    try {
        const v = getter()
        return typeof v === 'string' && v.length > 0 ? v : null
    } catch {
        return null
    }
},

_resolveTargetLanguage() {
    const getter = this._options.targetLanguageGetter
    if (typeof getter !== 'function') return null
    try {
        const v = getter()
        return typeof v === 'string' && v.length > 0 ? v : null
    } catch {
        return null
    }
},
```

Exactly mirrors `_resolveOrganisationUuid()`. Same tolerance,
same fall-through semantics, same null-on-error behaviour.

## URL stamping

`_buildUrl(type, id)` becomes:

```js
_buildUrl(type, id = null) {
    const config = this._getTypeConfig(type)
    let url = `${this._options.baseUrl}/${config.register}/${config.schema}`
    if (id) url += `/${id}`
    const lang = this._resolveLanguage()
    if (lang) url += buildQueryString({ _lang: lang })
    return url
}
```

`_lang` is stamped on **every** read URL — list, single, and the
plugin sub-resources that derive from this base. Callers that pass
extra query params via `buildQueryString(params)` in
`fetchCollection` already concatenate after `_buildUrl()`, so the
two query strings need a small reconcile: we move the `_lang` stamp
into the explicit `buildQueryString` call inside `fetchCollection`
when extra params are present, and keep it on `_buildUrl` for the
no-extra-params reads (`fetchObject`, `resolveReferences`,
sub-resource paths).

## Header stamping

`_buildHeaders(contentType)` becomes:

```js
_buildHeaders(contentType = 'application/json') {
    return buildHeaders({
        contentType,
        organisationUuid: this._resolveOrganisationUuid() || undefined,
        targetLanguage:   this._resolveTargetLanguage()   || undefined,
    })
}
```

`buildHeaders()` in `src/utils/headers.js` learns one new option:

```js
if (typeof opts.targetLanguage === 'string' && opts.targetLanguage.length > 0) {
    headers['X-Translation-Target-Language'] = opts.targetLanguage
}
```

Same shape as the existing `organisationUuid` branch — minimal
diff, parallel structure.

## Plugin inheritance

Plugins (`files.js`, `auditTrails.js`, `relations.js`, …) already
call `this._buildHeaders()` and `this._buildUrl()` per the
multi-tenancy-context migration. No plugin code changes — the new
options stamp through automatically.

## Backwards compatibility

- Consumers who don't pass `languageGetter` or `targetLanguageGetter`
  see no change in URL or header shape — `_resolveLanguage()` and
  `_resolveTargetLanguage()` both short-circuit to `null` and the
  stamps are skipped.
- Consumers who already pass `organisationUuidGetter` compose with
  the new options — all three resolvers are independent.
- The `buildHeaders()` positional `(contentType)` shape stays. Only
  the options-object shape grows.

## Test strategy

`tests/store/i18nNegotiation.spec.js` mirrors
`tests/store/multiTenancy.spec.js` structurally — one `describe`
block, one `fetchMock` setup, one test per acceptance scenario.
That keeps the test infrastructure footprint zero and makes the
two suites easy to read side by side.
