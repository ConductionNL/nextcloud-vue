# Tasks: r4-object-lock-url-and-credentials-copy

## 1. The lock goes to the object
- [x] 1.1 `src/composables/useObjectLock.js` reads its inputs with `toValue` and sends nothing while the target is incomplete; `src/components/CnDetailPage/CnDetailPage.vue` passes live getters.
  - test: `tests/components/CnDetailPageLockUrl.spec.js`, `src/composables/__tests__/useObjectLock.endpoints.spec.js` (10 fail on the old code)

## 2. Credentials copy in the Conduction voice
- [x] 2.1 `src/components/CnCredentials/CnCredentials.vue` intros without em-dashes; `l10n/en.json` and `l10n/nl.json` entries.
  - test: `tests/components/CnCredentialsCopy.spec.js` (7 fail on the old code)
