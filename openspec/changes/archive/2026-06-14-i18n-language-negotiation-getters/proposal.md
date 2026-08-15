# i18n Language Negotiation Getters

## Why

OpenRegister shipped two paired i18n capabilities weeks ago:

1. **`i18n-api-language-negotiation`** — every `objects` read endpoint
   accepts a `?_lang=<bcp47>` query parameter. The server resolves the
   requested language against an object's `_translations[lang]` payload
   and returns the localised projection in place of the source values.
   When no `?_lang` is supplied the source projection is returned.

2. **`i18n-source-of-truth`** — every object response now carries
   `sourceLanguage` (the canonical authoring language), `isSource`
   (boolean — `true` when the row is the canonical source), and a
   `_translationMeta: { translatedFrom: string|null, translatedAt?: string }`
   block describing whether the projection is a translation.
   `_translationMeta.translatedFrom === null` means the response **is**
   the source (no translation applied).

3. Writes that author or update a translated projection send the
   target language via the `X-Translation-Target-Language: <bcp47>`
   request header. The server stamps the new value into
   `_translations[<bcp47>]` instead of overwriting the source.

The frontend has **no primitive** to wire these contracts. Consumer
apps currently roll their own per-store fetch wrappers, hard-code
`?_lang=` query strings, and forget the write-side header. The audit
of larpingapp (§3.2/3.3) flagged this as the single biggest gap
between the apps and OR's shipped i18n capability.

The fix is a single, minimal primitive — `languageGetter` and
`targetLanguageGetter` options on `createObjectStore()` — that
mirrors the proven `organisationUuidGetter` pattern shipped in W21-C
(`multi-tenancy-context`). Same wiring, same fallback semantics, same
contract.

## What Changes

- Extend `src/store/useObjectStore.js::createObjectStore(id, options)`
  to accept two new optional factory options:
  - `languageGetter: () => string | null` — read-side language
    negotiation. When set, every read URL stamps `?_lang=<value>`.
  - `targetLanguageGetter: () => string | null` — write-side target
    language. When set, every write request stamps
    `X-Translation-Target-Language: <value>`.
- Implementation lives in two existing helpers:
  - `_buildUrl(type, id)` — appends `?_lang=<value>` (via
    `buildQueryString`) when `languageGetter` returns a non-empty
    string.
  - `_buildHeaders(contentType)` — adds the
    `X-Translation-Target-Language` header when `targetLanguageGetter`
    returns a non-empty string. The existing `buildHeaders()` helper
    in `src/utils/headers.js` is extended to accept the
    `targetLanguage` option, matching the `organisationUuid` shape.
- Both getters MUST be tolerant: a getter returning `null`,
  `undefined`, or an empty string is equivalent to "no header / no
  query param". A getter throwing an exception is caught and
  downgraded to "no header / no query param" so a buggy getter never
  breaks an outbound request (same contract as
  `organisationUuidGetter`).
- Document the contract in `docs/composables/use-object-store.md`
  (new file) and update `docs/store/object-store.md` factory options
  table.

## Problem

Consumers face three concrete pains today:

1. **No language read-stamping.** `useObjectStore().fetchCollection`
   issues `GET /apps/openregister/api/objects/<reg>/<sch>` with no
   `?_lang=`, so the user's language preference never reaches OR.
   Every app that wants a translated list has to subclass the store
   or write a per-call wrapper, defeating the abstraction.

2. **No write-target header.** When an editor authors a `nl-NL`
   translation of a `en` source object, the app body has no
   way to signal "this is a translation, not a source overwrite."
   The result: editors accidentally overwrite the source row.

3. **Per-app drift.** larpingapp, procest, and decidesk each ship a
   slightly different per-store i18n shim. Three different bug
   surfaces, three different test gaps. The library should own the
   primitive.

## Proposed Solution

A two-getter extension to `createObjectStore`'s options object —
**no breaking change**. Consumers who don't wire the getters keep
current behaviour byte-for-byte. Consumers who wire them get the
correct OR `?_lang=` + `X-Translation-Target-Language` contract on
every plugin-routed request, for free.

The pattern is the proven `organisationUuidGetter` shape from W21-C:

```js
import { createObjectStore } from '@conduction/nextcloud-vue'
import { useUserLanguage } from './composables/useUserLanguage.js'

const userLang = useUserLanguage() // app-specific source of truth

export const useMyStore = createObjectStore('myapp', {
    languageGetter: () => userLang.value,
    targetLanguageGetter: () => userLang.value,
})
```

When `userLang.value === 'nl-NL'`, every store read URL becomes
`?_lang=nl-NL` and every store write request carries
`X-Translation-Target-Language: nl-NL`. Plugins (files, audit,
relations, …) inherit automatically because they already route
through `this._buildHeaders()` and `this._buildUrl()`.

## Out of scope

- A `useLanguageContext()` composable (mirrors `useTenantContext` but
  for language). Deferred — apps already have an app-specific
  language source (NC user settings, app-level dropdown, URL
  segment) and the value-add of a shared composable is small. The
  two getters are the minimal contract; consumers wire whatever
  source they like.
- The CnDetail-side surfacing of `_translationMeta` (the "translated
  from {source}" badge). That ships as the sibling change
  `cn-detail-translation-aware-surfacing` so both can land
  independently.
- Server-side validation of `X-Translation-Target-Language`. The
  server already accepts it as part of `i18n-api-language-negotiation`.

## See also

- Hydra ADR-022 (apps consume OR abstractions)
- OR `openspec/changes/i18n-api-language-negotiation/` — server-side
  contract this change consumes.
- OR `openspec/changes/i18n-source-of-truth/` — `_translationMeta`
  shape consumed by the sibling change.
- `openspec/changes/multi-tenancy-context/` — proven
  `organisationUuidGetter` pattern this change mirrors.
- larpingapp `openspec/changes/adopt-or-abstractions/proposal.md`
  §3.2 / §3.3 — handoff pointer this change closes.
- procest `openspec/changes/adopt-or-abstractions/proposal.md` — same.
