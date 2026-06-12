---
sidebar_position: 3
---

# useObjectStore — factory option getters

`@conduction/nextcloud-vue` ships a single shared object-store factory
(`createObjectStore`) that consumer apps wire to OpenRegister's
`/apps/openregister/api/objects` endpoint. The factory accepts three
optional **getter** options that thread per-request context into the
store's `_buildHeaders()` and `_buildUrl()` helpers — so every
plugin-routed request (files, audit, relations, search, …) inherits
the same headers and query parameters without per-callsite glue.

| Getter | When called | What it stamps | OR contract |
|--------|-------------|----------------|-------------|
| `organisationUuidGetter` | Every request | `X-OpenRegister-Organisation: <uuid>` header | `multi-tenancy-context` |
| `languageGetter` | Every read URL | `?_lang=<bcp47>` query parameter | `i18n-api-language-negotiation` |
| `targetLanguageGetter` | Every write request | `X-Translation-Target-Language: <bcp47>` header | `i18n-source-of-truth` |

All three getters share the same contract:

- **Signature:** `() => string | null`.
- **Null / empty return:** stamp is skipped (no header / no query
  parameter). Behaviour matches a store created without the getter.
- **Throwing return:** caught internally and downgraded to `null`. A
  buggy getter NEVER breaks an outbound request — it simply skips
  the stamp.
- **Plugin inheritance:** the bundled plugins (`filesPlugin`,
  `auditTrailsPlugin`, `relationsPlugin`, `registerMappingPlugin`,
  `lifecyclePlugin`, `searchPlugin`, `selectionPlugin`,
  `logsPlugin`) route every fetch through `this._buildHeaders()` and
  `this._buildUrl()` — so the new options take effect transparently.

## Language negotiation getters (`languageGetter`, `targetLanguageGetter`)

OpenRegister ships two paired i18n capabilities:

1. **Read side (`i18n-api-language-negotiation`)** — every read
   endpoint accepts `?_lang=<bcp47>`. When supplied, OR resolves the
   requested language against the object's `_translations[lang]`
   payload and returns the localised projection. When omitted, OR
   returns the source row.
2. **Write side (`i18n-source-of-truth`)** — every write endpoint
   accepts an `X-Translation-Target-Language: <bcp47>` request
   header. When supplied, OR stamps the payload into
   `_translations[<bcp47>]` instead of overwriting the canonical
   source row.

The two getters wire both sides:

```js
import { createObjectStore } from '@conduction/nextcloud-vue'

// Read the user's preferred BCP-47 language from anywhere
// (NC user settings, app-level dropdown, URL segment, …).
const userLanguage = ref('nl')

export const useMyStore = createObjectStore('myapp-objects', {
    // Every read URL gets ?_lang=nl appended.
    languageGetter: () => userLanguage.value,

    // Every write request gets X-Translation-Target-Language: nl.
    // Editing an existing object updates its nl translation
    // projection rather than the source row.
    targetLanguageGetter: () => userLanguage.value,
})
```

When `userLanguage.value` flips to a different BCP-47 string the very
next request automatically picks up the new value — the getter is
evaluated **per request**, not at factory time.

### Read-side: `languageGetter`

| Behaviour | Result |
|-----------|--------|
| `languageGetter` omitted | URL has no `_lang=` |
| `languageGetter()` returns `'nl'` | URL contains `?_lang=nl` (or `&_lang=nl` when other params present) |
| `languageGetter()` returns `null` or `''` | URL has no `_lang=` |
| `languageGetter()` throws | URL has no `_lang=`, no error propagates |

The library reconciles `_lang` with caller-supplied query parameters
internally — `_lang` appears **exactly once** per URL even when the
caller passes their own `buildQueryString(params)` payload.

### Write-side: `targetLanguageGetter`

| Behaviour | Result |
|-----------|--------|
| `targetLanguageGetter` omitted | Header absent |
| `targetLanguageGetter()` returns `'nl'` | Header `X-Translation-Target-Language: nl` |
| `targetLanguageGetter()` returns `null` or `''` | Header absent |
| `targetLanguageGetter()` throws | Header absent, no error propagates |

The header is stamped on POST and PUT alike (create and update).
DELETE doesn't carry a translation target.

## Composes with `organisationUuidGetter`

All three getters are independent. Wiring them together produces:

```js
const useStore = createObjectStore('myapp', {
    organisationUuidGetter: () => activeOrg.value,
    languageGetter:        () => userLang.value,
    targetLanguageGetter:  () => userLang.value,
})
```

A read request now stamps `X-OpenRegister-Organisation: <org>` AND
`?_lang=<lang>`. A write request stamps both headers (org + target
language). Every plugin call inherits the same stamps.

## Surfacing translations to the user

A read configured with `languageGetter` returns objects whose
`_translationMeta.translatedFrom` is non-null. The
[`CnTranslatedBadge`](../components/cn-translated-badge.md) component
renders a small *(translated from {sourceLanguage})* chip in
`CnDetailGrid` and `CnDetailPage` so the end-user sees that they are
reading a translation, not the source. See the
`cn-detail-translation-aware-surfacing` change for details.

## See also

- [`docs/store/object-store.md`](../store/object-store.md) — full
  factory option table.
- [`docs/composables/use-tenant-context.md`](./use-tenant-context.md)
  — `organisationUuidGetter` deep-dive.
- `openspec/changes/i18n-language-negotiation-getters/` — the change
  introducing the two language getters.
- `openspec/changes/multi-tenancy-context/` — the change introducing
  `organisationUuidGetter`.
