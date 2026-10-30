# A held lock keeps a record until it is unlocked

## Why
Board PqTicket (design-system #821) draws a finished request locked: a "Vergrendeld" pill beside its status, Bewerken disabled with "Vergrendeld: eerst ontgrendelen", and a card "Vergrendeld door Pieter Jansen op 12 oktober 2026 om 16:40. Niemand kan dit ticket wijzigen of verwijderen." with Ontgrendelen. OpenRegister already has this lock: `POST .../lock` without a duration stores a lock with no expiry, which refuses every other user's write until the holder unlocks it. The library treated it as an edit lock:
- it read the expiry from `expiresAt` while OpenRegister writes `expiration`, so no lock ever lapsed in the UI;
- leaving the page (unmount, `beforeunload`) released any lock the reader held, so a held lock was gone as soon as its holder navigated away;
- Edit stayed open to the holder, and opening it swapped the held lock for a 30 minute edit lock.

## What changes
- `objectLock.js`: `lockExpiryOf` reads `expiresAt` or `expiration`; `isHeldLock` names a lock without either.
- `useObjectLock`: `held` and `lockedAt`; a held lock is never released by leaving the page or renewed as an edit lock.
- `CnLockedBanner`: `held`, `lockedAt`, `heldMessage`: who locked it and when, and that nobody can change it until it is unlocked; Unlock stays the holder's.
- `CnDetailPage`: a "Locked" pill beside the status, Edit disabled with "Locked: unlock it first" (also for the holder), and `config.lockNotice` for the app's own sentence.

Taking the lock is configuration: an `api-call` header action to OpenRegister's lock route, gated on the record's state (pipelinq: a finished ticket).

## Out of scope
OpenRegister's semantics stay: the holder's own writes are not refused server side, so the guard against the holder editing a held record is the disabled Edit. Other users are refused by the server.
