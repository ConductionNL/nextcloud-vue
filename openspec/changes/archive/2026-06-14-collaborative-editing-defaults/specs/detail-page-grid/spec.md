# Detail Page — collaborative-editing defaults

## ADDED Requirements

### Requirement: REQ-DPG-COLLAB-001 — `CnDetailPage` auto-subscribes by default

`CnDetailPage` MUST call `useObjectSubscription(register, schema, objectId)` when its `register`, `schema`, and `objectId` props are all set, UNLESS the manifest sets `pages[].config.subscribe: false`.

#### Scenario: Default behaviour subscribes

- GIVEN a CnDetailPage mounted with `register='decidesk'`, `schema='meeting'`, `objectId='uuid-1'`
- WHEN the component finishes mounting
- THEN `objectStore.subscribe('meeting', 'uuid-1')` MUST be called exactly once

#### Scenario: Opt-out skips subscription

- GIVEN a manifest page with `config.subscribe: false`
- WHEN CnDetailPage mounts
- THEN `objectStore.subscribe` MUST NOT be called

---

### Requirement: REQ-DPG-COLLAB-002 — `CnDetailPage` lock-on-edit gating

When the user toggles edit mode, `CnDetailPage` MUST call `useObjectLock.acquire()` BEFORE flipping internal `editing` state to `true`. If `acquire()` rejects with `LockConflictError`, the edit toggle MUST stay disabled and a `CnLockedBanner` MUST render with the conflicting user. If it rejects with `PermissionError`, edit mode MUST proceed AND a one-time toast warns the user.

#### Scenario: Edit mode acquires lock first

- GIVEN a CnDetailPage with `lock` not opted-out and an unlocked object
- WHEN the user clicks the Edit toggle
- THEN `acquire()` MUST be called
- AND only after `acquire()` resolves, `editing` MUST become `true`

#### Scenario: Conflict suppresses edit + shows banner

- GIVEN the object is locked by user B
- WHEN the user clicks Edit
- THEN `acquire()` rejects with `LockConflictError`
- AND `editing` MUST remain `false`
- AND a `CnLockedBanner` component MUST render with B's displayName and the lock expiry

#### Scenario: Permission denied falls back to edit-without-lock

- GIVEN the user does NOT have the `lock` permission on the schema
- WHEN the user clicks Edit
- THEN `acquire()` rejects with `PermissionError`
- AND `editing` MUST become `true`
- AND a toast warns "Concurrent edits are not blocked on this schema"

---

### Requirement: REQ-DPG-COLLAB-003 — Save / cancel release the lock

When `editing` flips back to `false` (via Save success, Cancel, or navigation away), `CnDetailPage` MUST call `release()` if the current user holds the lock.

#### Scenario: Save releases

- GIVEN the user is editing with a held lock
- WHEN Save succeeds and `editing` becomes `false`
- THEN `release()` MUST be called
- AND `lockedByMe.value` MUST become `false`

#### Scenario: Cancel releases

- GIVEN the user is editing with a held lock
- WHEN Cancel is clicked
- THEN `release()` MUST be called

#### Scenario: Navigation releases

- GIVEN the user is editing with a held lock
- WHEN the route changes
- THEN `release()` MUST be called via `tryOnScopeDispose`

---

### Requirement: REQ-DPG-COLLAB-004 — Manifest opt-out fields

`pages[].config` MUST accept two optional Boolean fields `subscribe` and `lock`. Both default to `true`. The manifest schema MUST validate them.

#### Scenario: Manifest with `subscribe: false`

- GIVEN `pages[].config.subscribe = false`
- WHEN `validateManifest` runs
- THEN no validation errors are produced
- AND the rendered CnDetailPage skips `useObjectSubscription`

#### Scenario: Manifest with `lock: false`

- GIVEN `pages[].config.lock = false`
- WHEN the user clicks Edit
- THEN `acquire()` MUST NOT be called
- AND `editing` flips to `true` directly
