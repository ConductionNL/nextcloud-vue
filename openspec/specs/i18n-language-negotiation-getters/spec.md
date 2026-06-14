# i18n-language-negotiation-getters Specification

## Purpose
TBD - created by archiving change i18n-language-negotiation-getters. Update Purpose after archive.
## Requirements
### Requirement: `buildHeaders()` MUST stamp `X-Translation-Target-Language` when `targetLanguage` is provided

`buildHeaders({ targetLanguage })` MUST add
`X-Translation-Target-Language: <value>` to the returned headers
object when `targetLanguage` is a non-empty string. When
`targetLanguage` is `null`, `undefined`, or an empty string, the
header MUST be absent.

#### Scenario: header is stamped when targetLanguage is provided
- WHEN `buildHeaders({ targetLanguage: 'nl' })` is called
- THEN the returned headers object MUST include
  `'X-Translation-Target-Language': 'nl'`

#### Scenario: header is omitted when targetLanguage is null
- WHEN `buildHeaders({ targetLanguage: null })` is called
- THEN the returned headers object MUST NOT include
  `X-Translation-Target-Language`

#### Scenario: header is omitted when targetLanguage is empty string
- WHEN `buildHeaders({ targetLanguage: '' })` is called
- THEN the returned headers object MUST NOT include
  `X-Translation-Target-Language`

#### Scenario: composes with organisationUuid
- WHEN `buildHeaders({ organisationUuid: 'org-1', targetLanguage: 'en' })`
  is called
- THEN the returned headers object MUST include both
  `'X-OpenRegister-Organisation': 'org-1'` and
  `'X-Translation-Target-Language': 'en'`

### Requirement: `createObjectStore` MUST accept `languageGetter`

`createObjectStore(id, { languageGetter })` MUST accept an optional
`languageGetter: () => string | null` field in its options object.
When provided, every store action issuing a GET request MUST append
`?_lang=<value>` to the request URL, where `<value>` is the
non-empty string returned by `languageGetter()`. When the getter
returns `null`, `undefined`, an empty string, or throws an exception,
the request URL MUST NOT include the `_lang` query parameter.

#### Scenario: store stamps `_lang` when getter returns a language
- GIVEN a store created with `languageGetter: () => 'nl'`
- AND `store.registerObjectType('case', 'sch-1', 'reg-1')`
- WHEN `store.fetchCollection('case', {})` issues an HTTP request
- THEN the request URL MUST include `_lang=nl`

#### Scenario: store omits `_lang` when getter is unset
- GIVEN a store created without `languageGetter`
- AND `store.registerObjectType('case', 'sch-1', 'reg-1')`
- WHEN `store.fetchCollection('case', {})` issues an HTTP request
- THEN the request URL MUST NOT include the `_lang` query parameter

#### Scenario: store omits `_lang` when getter returns null
- GIVEN a store created with `languageGetter: () => null`
- WHEN `store.fetchCollection('case', {})` issues an HTTP request
- THEN the request URL MUST NOT include the `_lang` query parameter

#### Scenario: store omits `_lang` when getter throws
- GIVEN a store created with `languageGetter: () => { throw new Error('boom') }`
- WHEN `store.fetchCollection('case', {})` issues an HTTP request
- THEN the request URL MUST NOT include the `_lang` query parameter
- AND no error MUST propagate to the caller

#### Scenario: `_lang` is stamped on single-object reads
- GIVEN a store created with `languageGetter: () => 'nl'`
- AND `store.registerObjectType('case', 'sch-1', 'reg-1')`
- WHEN `store.fetchObject('case', 'obj-1')` issues an HTTP request
- THEN the request URL MUST include `_lang=nl`

### Requirement: `createObjectStore` MUST accept `targetLanguageGetter`

`createObjectStore(id, { targetLanguageGetter })` MUST accept an
optional `targetLanguageGetter: () => string | null` field in its
options. When provided, every store action issuing a write request
(POST, PUT) MUST stamp `X-Translation-Target-Language: <value>` on
the outbound request, where `<value>` is the non-empty string
returned by `targetLanguageGetter()`. When the getter returns
`null`, `undefined`, an empty string, or throws an exception, the
header MUST be absent.

#### Scenario: write stamps target-language header
- GIVEN a store created with `targetLanguageGetter: () => 'nl'`
- AND `store.registerObjectType('case', 'sch-1', 'reg-1')`
- WHEN `store.saveObject('case', { title: 'Iets' })` issues a POST
- THEN the request headers MUST include
  `'X-Translation-Target-Language': 'nl'`

#### Scenario: write omits header when getter is unset
- GIVEN a store created without `targetLanguageGetter`
- WHEN `store.saveObject('case', { title: 'A new object' })` issues a POST
- THEN the request headers MUST NOT include
  `X-Translation-Target-Language`

#### Scenario: write omits header when getter throws
- GIVEN a store created with `targetLanguageGetter: () => { throw new Error('boom') }`
- WHEN `store.saveObject('case', { title: 'X' })` issues a POST
- THEN the request headers MUST NOT include
  `X-Translation-Target-Language`
- AND no error MUST propagate to the caller

#### Scenario: target-language header stamps on update (PUT)
- GIVEN a store created with `targetLanguageGetter: () => 'en'`
- AND `store.registerObjectType('case', 'sch-1', 'reg-1')`
- WHEN `store.saveObject('case', { id: 'obj-1', title: 'X' })` issues a PUT
- THEN the request headers MUST include
  `'X-Translation-Target-Language': 'en'`

### Requirement: language getters MUST compose with `organisationUuidGetter`

The three resolvers (`organisationUuidGetter`, `languageGetter`, `targetLanguageGetter`) MUST be independent and MUST NOT interfere with each other. When all three are set on the same store, every outbound request MUST stamp `X-OpenRegister-Organisation`,
`X-Translation-Target-Language`, AND the read URL MUST carry
`?_lang=<value>` together. The three resolvers are independent and
MUST NOT interfere with each other.

#### Scenario: all three getters compose on a read request
- GIVEN a store created with `organisationUuidGetter: () => 'org-1'`,
  `languageGetter: () => 'nl'`, and `targetLanguageGetter: () => 'nl'`
- AND `store.registerObjectType('case', 'sch-1', 'reg-1')`
- WHEN `store.fetchCollection('case', {})` issues a GET
- THEN the request URL MUST include `_lang=nl`
- AND the request headers MUST include
  `'X-OpenRegister-Organisation': 'org-1'`

#### Scenario: all three getters compose on a write request
- GIVEN a store created with `organisationUuidGetter: () => 'org-1'`,
  `languageGetter: () => 'nl'`, and `targetLanguageGetter: () => 'nl'`
- AND `store.registerObjectType('case', 'sch-1', 'reg-1')`
- WHEN `store.saveObject('case', { title: 'X' })` issues a POST
- THEN the request headers MUST include both
  `'X-OpenRegister-Organisation': 'org-1'` and
  `'X-Translation-Target-Language': 'nl'`

### Requirement: store plugins MUST inherit the language stamps

The bundled plugins (`filesPlugin`, `auditTrailsPlugin`, `relationsPlugin`, `registerMappingPlugin`, `lifecyclePlugin`, `searchPlugin`, `selectionPlugin`, `logsPlugin`) MUST issue every HTTP request via
the store's `this._buildHeaders()` and `this._buildUrl()` helpers so
the new `_lang` query parameter and `X-Translation-Target-Language`
header inherit automatically. No plugin-side code change is
required; this requirement is enforced by routing.

#### Scenario: a plugin write inherits the target-language header
- GIVEN a store created with `targetLanguageGetter: () => 'nl'`
- AND a plugin whose action calls `this._buildHeaders()` and issues
  a POST
- WHEN the plugin's action runs
- THEN the request headers MUST include
  `'X-Translation-Target-Language': 'nl'`

