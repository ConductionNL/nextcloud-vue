# Tasks: record-lock-held

### Task 1: A lock without an expiry holds the record
- **spec_ref**: `openspec/changes/record-lock-held/specs/object-lock/spec.md#requirement-a-lock-without-an-expiry-holds-the-record`
- **files**: `src/utils/objectLock.js`, `src/composables/useObjectLock.js`
- [x] Implement: `lockExpiryOf`, `isHeldLock`, `held`, `lockedAt`; no release or renew of a held lock
- [x] Test: `tests/composables/useObjectLockHeld.spec.js`

### Task 2: A held lock is named with who and when, and Edit waits for Unlock
- **spec_ref**: `openspec/changes/record-lock-held/specs/object-lock/spec.md#requirement-a-held-lock-is-named-with-who-and-when-and-edit-waits-for-unlock`
- **files**: `src/components/CnLockedBanner/CnLockedBanner.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `l10n/*.json`
- [x] Implement: banner `held`/`lockedAt`/`heldMessage`, page pill, disabled Edit, `lockNotice`
- [x] Test: `tests/components/CnLockedBannerHeld.spec.js`
