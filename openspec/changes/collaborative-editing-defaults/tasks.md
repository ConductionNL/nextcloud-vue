# Tasks: collaborative-editing-defaults

> **Phasing:** v1 ships the composables (`useObjectSubscription`,
> `useObjectLock`) as public APIs, the `CnLockedBanner`
> presentation component, and **auto-subscribe defaults** on
> `CnDetailPage` / `CnObjectSidebar`. The lock acquire/release
> integration into the inline editors (`CnAdvancedFormDialog` /
> `CnFormDialog`'s `@open` and `@close` hooks) lands as a v2
> follow-up tracked by [openregister GitHub issue link in PR](#).
> v1 alone delivers the live-update piece end-to-end and exposes
> the lock primitives for early adopters.

## 1. Composables

### Task 1.1: Create useObjectSubscription

- **spec_ref**: `specs/composables/spec.md` — REQ-CO-LOCK-001
- **files**: `src/composables/useObjectSubscription.js`, `src/composables/index.js`, `src/index.js`
- **acceptance_criteria**:
  - GIVEN component setup() THEN `objectStore.subscribe` called once on mount
  - GIVEN component unmount THEN `unsubscribe(handle)` called once
  - GIVEN reactive `id` ref change THEN previous handle released, new handle acquired
  - GIVEN `enabled: ref(false)` THEN no subscribe call
- [ ] 1.1 Create `src/composables/useObjectSubscription.js` with `tryOnScopeDispose` cleanup and `watch` on reactive inputs

### Task 1.2: Create useObjectLock

- **spec_ref**: `specs/composables/spec.md` — REQ-CO-LOCK-002, REQ-CO-LOCK-003, REQ-CO-LOCK-004
- **files**: `src/composables/useObjectLock.js`, `src/composables/index.js`, `src/index.js`
- **acceptance_criteria**:
  - GIVEN store cache has `@self.locked` THEN `locked.value === true`
  - GIVEN current user matches `@self.locked.user` THEN `lockedByMe.value === true`
  - GIVEN `acquire()` and 200 response THEN promise resolves and `lockedByMe` flips to true
  - GIVEN 409 response THEN throws `LockConflictError` with `lockedBy` populated
  - GIVEN scope disposed with held lock THEN DELETE issued
  - GIVEN `beforeunload` with held lock THEN `navigator.sendBeacon` called
- [ ] 1.2 Create `src/composables/useObjectLock.js` with computed lock state, acquire/release actions, auto-renew interval, beforeunload handler

### Task 1.3: Export typed errors

- **spec_ref**: `specs/composables/spec.md` — REQ-CO-LOCK-003
- **files**: `src/composables/useObjectLock.js`, `src/index.js`
- **acceptance_criteria**:
  - GIVEN `LockConflictError` is exported THEN consumers can `instanceof` it
  - GIVEN `PermissionError` is exported THEN consumers can `instanceof` it
- [ ] 1.3 Export `LockConflictError` and `PermissionError` from the public barrel

---

## 2. Detail page wiring

### Task 2.1: Wire useObjectSubscription into CnDetailPage

- **spec_ref**: `specs/detail-page-grid/spec.md` — REQ-DPG-COLLAB-001
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`
- **acceptance_criteria**:
  - GIVEN register + schema + objectId set THEN subscribe called
  - GIVEN `subscribe: false` prop THEN no subscribe
- [ ] 2.1 Add `subscribe` prop (default true) and call `useObjectSubscription` in `setup()`

### Task 2.2: Wire useObjectLock into CnDetailPage edit toggle

- **spec_ref**: `specs/detail-page-grid/spec.md` — REQ-DPG-COLLAB-002, REQ-DPG-COLLAB-003
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`
- **acceptance_criteria**:
  - GIVEN Edit click on unlocked object THEN acquire() called before editing flips
  - GIVEN LockConflictError THEN editing stays false, banner renders
  - GIVEN PermissionError THEN editing flips true with one-time toast
  - GIVEN Save/Cancel/navigation THEN release() called
- [ ] 2.2 Add `lock` prop (default true), wrap edit toggle, render banner on conflict

### Task 2.3: Mirror onto CnObjectSidebar

- **spec_ref**: `specs/detail-page-grid/spec.md` — same requirements (CnObjectSidebar shares the detail surface)
- **files**: `src/components/CnObjectSidebar/CnObjectSidebar.vue`
- **acceptance_criteria**:
  - GIVEN sidebar tab opens an object THEN subscribe called for that object
  - GIVEN sidebar's edit affordance triggers THEN acquire/release lifecycle runs
- [ ] 2.3 Apply the same composables to CnObjectSidebar's active object

---

## 3. UI

### Task 3.1: Create CnLockedBanner component

- **spec_ref**: `specs/detail-page-grid/spec.md` — REQ-DPG-COLLAB-002
- **files**: `src/components/CnLockedBanner/CnLockedBanner.vue`, `src/components/CnLockedBanner/index.js`, `src/components/index.js`, `src/index.js`, `docs/components/cn-locked-banner.md`
- **acceptance_criteria**:
  - GIVEN `lockedBy` prop THEN renders "Locked by {lockedBy}"
  - GIVEN `expiresAt` prop THEN renders relative time ("expires in 23 min")
  - GIVEN small / collapsed mode THEN icon + 1-line text only
  - GIVEN i18n THEN strings go through `t('nextcloud-vue', ...)`
- [ ] 3.1 Create the banner component, register in barrels, write docs page

---

## 4. Manifest schema

### Task 4.1: Add `subscribe` + `lock` to widgetDef config

- **spec_ref**: `specs/detail-page-grid/spec.md` — REQ-DPG-COLLAB-004
- **files**: `src/schemas/app-manifest.schema.json`, `src/utils/validateManifest.js`, `tests/schemas/app-manifest.schema.spec.js`
- **acceptance_criteria**:
  - GIVEN `pages[].config.subscribe = false` THEN validates
  - GIVEN `pages[].config.lock = false` THEN validates
  - GIVEN unknown values (e.g. `subscribe: "yes"`) THEN validation error
- [ ] 4.1 Extend the detail-page config description and add the two Booleans

---

## 5. Tests

### Task 5.1: Unit tests for useObjectSubscription

- **files**: `tests/composables/useObjectSubscription.spec.js`
- **acceptance_criteria**: All scenarios in REQ-CO-LOCK-001 covered
- [ ] 5.1 Mock `objectStore`, assert subscribe/unsubscribe lifecycle + reactive id flips

### Task 5.2: Unit tests for useObjectLock

- **files**: `tests/composables/useObjectLock.spec.js`
- **acceptance_criteria**: All scenarios in REQ-CO-LOCK-002 / 003 / 004 covered (mocked `axios` + mocked store cache)
- [ ] 5.2 Test acquire/release/auto-renew + typed errors + beforeunload

### Task 5.3: Integration tests on CnDetailPage

- **files**: `tests/components/CnDetailPageCollabEdit.spec.js`
- **acceptance_criteria**: Default subscribe + opt-out + lock-on-edit flow + conflict banner + release on save/cancel
- [ ] 5.3 Mount CnDetailPage with mocked store and axios; assert end-to-end behaviour

---

## 6. Documentation

### Task 6.1: Update detail-page docs

- **files**: `docs/components/cn-detail-page.md`
- **acceptance_criteria**: New "Collaborative editing defaults" section explaining auto-subscribe + lock-on-edit + opt-out
- [ ] 6.1 Document the defaults and the manifest opt-out

### Task 6.2: Composable docs

- **files**: `docs/utilities/composables/use-object-subscription.md`, `docs/utilities/composables/use-object-lock.md`
- **acceptance_criteria**: One page per composable, signature + return shape + scenarios + cross-link to OR push events
- [ ] 6.2 Author both composable docs

### Task 6.3: OR collaborative-editing patterns doc

- **files**: `openregister/docs/Patterns/collaborative-editing.md` (new file in the openregister repo)
- **acceptance_criteria**: One page tying push events + lock APIs + the lib defaults; cross-link to `Integrations/OpenRegister.md` and `Features/objects.md`
- [ ] 6.3 Write the OR patterns doc (separate PR against openregister/development)

---

## Dependency order

1.1 → 1.3 → 2.1 (subscribe wiring is independent of lock)
1.2 → 1.3 → 2.2 → 3.1 (lock wiring needs banner)
2.1 + 2.2 → 2.3 (sidebar mirrors detail page)
4.1 (manifest schema, can run in parallel)
5.* (tests, after 1.* and 2.*)
6.* (docs, after 1.*, 2.*, 3.*)
