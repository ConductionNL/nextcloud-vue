# object-lock Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-lock-held](../../)

## Purpose

A record locked without an expiry stays locked until somebody unlocks it, and the page says so.

## ADDED Requirements

### Requirement: A lock without an expiry holds the record

The library SHALL read a lock's expiry from `expiresAt` or OpenRegister's `expiration`, SHALL treat a lock with neither as held, and SHALL NOT release or renew a held lock when its holder leaves the page or the page unmounts. An edit lock SHALL keep lapsing and being released as before.

#### Scenario: Pieter leaves a ticket he locked

- **GIVEN** Pieter locked a finished ticket from its menu (a lock without an expiry)
- **WHEN** he navigates to another page
- **THEN** no unlock request is sent and the ticket stays locked

#### Scenario: An edit lock lapses

- **GIVEN** a record whose lock carries an `expiration` in the past
- **THEN** the record reads as not locked

### Requirement: A held lock is named with who and when, and Edit waits for Unlock

A detail page whose record carries a held lock SHALL show a "Locked" pill beside the status, SHALL show the locked card with who locked it and when (`config.lockNotice` for the app's sentence, the library's otherwise), SHALL offer Unlock to the holder only, and SHALL disable Edit for every reader with "Locked: unlock it first" until it is unlocked.

#### Scenario: PqTicket

- **GIVEN** ticket PQ-2026-0417, finished and locked by Pieter Jansen on 12 October 2026 at 16:40
- **WHEN** Pieter opens it
- **THEN** the header shows "Vergrendeld" beside "Afgerond", Bewerken is disabled, and the card reads "Vergrendeld door Pieter Jansen op 12 oktober 2026 om 16:40." with Ontgrendelen
