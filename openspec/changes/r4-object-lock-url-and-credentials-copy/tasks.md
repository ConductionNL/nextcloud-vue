# Tasks: r4-object-lock-url-and-credentials-copy

## 1. The lock goes to the object
- [x] 1.1 `src/composables/useObjectLock.js` reads its inputs with `toValue` and sends nothing while the target is incomplete; `src/components/CnDetailPage/CnDetailPage.vue` passes live getters.
  - test: `tests/components/CnDetailPageLockUrl.spec.js`, `src/composables/__tests__/useObjectLock.endpoints.spec.js` (10 fail on the old code)

## 2. Credentials copy in the Conduction voice
- [x] 2.1 `src/components/CnCredentials/CnCredentials.vue` intros without em-dashes; `l10n/en.json` and `l10n/nl.json` entries.
  - test: `tests/components/CnCredentialsCopy.spec.js` (7 fail on the old code; the source-wide em-dash check fails on the old comments)

## 3. Related sections load one at a time
- [x] 3.1 `src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue` `loadTabs()` fills each section as its request returns; pending and failed sections are named; stale loads are dropped.
  - test: `tests/components/CnRelatedObjectsWidgetProgressive.spec.js` (3 fail on the old code)

## 4. The manifest Add label is translated
- [x] 4.1 `src/components/CnObjectListWidget/CnObjectListWidget.vue` `addLabel` goes through `cnTranslate`.
  - test: `tests/components/CnObjectListWidgetAddLabel.spec.js` (1 fails on the old code)
