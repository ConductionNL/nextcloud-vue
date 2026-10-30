/**
 * One reading of "is this object locked, and by whom".
 *
 * 🔴 THIS EXISTS SO THERE IS EXACTLY ONE OF IT. The lock lives in
 * `@self.locked` as `{ user, displayName?, expiresAt? }`, and the only place
 * that knew how to read it was `useObjectLock` — a composable that takes an
 * object STORE, a register, a schema and an id, and subscribes. That shape is
 * right for a detail page holding one record and wrong for every list: a card
 * grid rendering forty rows cannot mount forty subscriptions to find out which
 * of them carry a padlock.
 *
 * So the lists showed nothing, and a locked record was indistinguishable from
 * an unlocked one until you opened it and tried to save.
 *
 * These helpers read a record that is ALREADY in hand. No store, no request, no
 * subscription — which is exactly what a row renderer can afford.
 *
 * The expiry rule is the part that must not be re-implemented per call site: a
 * lock whose `expiresAt` has passed is NOT a lock. Getting that wrong in a list
 * paints padlocks on records anyone may edit, which trains people to ignore the
 * padlock.
 */

import { getCurrentUser } from '@nextcloud/auth'

/**
 * Read the raw lock payload off a record.
 *
 * Accepts both envelope shapes: a record carrying `@self` and a flat one where
 * the metadata sits at the top level. Both occur — the object store holds the
 * former, several widget props pass the latter.
 *
 * @param {object|null} object - The record.
 * @return {object|null} The lock payload, or null when there is none.
 */
export function readLockPayload(object) {
	if (!object || typeof object !== 'object') {
		return null
	}
	const self = object['@self'] ?? object
	const lock = self?.locked
	if (!lock || typeof lock !== 'object') {
		return null
	}
	return lock
}

/**
 * When a lock lapses, or null for a held lock that lasts until it is
 * unlocked. OpenRegister writes the moment as `expiration`; `expiresAt` is
 * the older spelling and still read.
 *
 * @param {object|null} lock - The lock payload.
 * @return {Date|null} The expiry, or null when the lock has none.
 * @spec openspec/changes/record-lock-held/specs/object-lock/spec.md#requirement-a-lock-without-an-expiry-holds-the-record
 */
export function lockExpiryOf(lock) {
	const raw = lock?.expiresAt ?? lock?.expiration ?? null
	if (!raw) {
		return null
	}
	const parsed = new Date(raw)
	return Number.isFinite(parsed.getTime()) ? parsed : null
}

/**
 * Whether a lock payload is a held lock: one taken without a duration, which
 * holds the record until somebody unlocks it (a finished ticket locked from
 * its menu), as opposed to the edit lock that lapses on its own.
 *
 * @param {object|null} lock - The lock payload.
 * @return {boolean} True for a lock without an expiry.
 * @spec openspec/changes/record-lock-held/specs/object-lock/spec.md#requirement-a-lock-without-an-expiry-holds-the-record
 */
export function isHeldLock(lock) {
	return Boolean(lock && typeof lock === 'object' && !lock.expiresAt && !lock.expiration)
}

/**
 * Whether a record is locked RIGHT NOW.
 *
 * An expired lock reports false. The server has not necessarily cleared the
 * column yet — expiry is evaluated on read, not swept — so a caller that only
 * checks for the key's presence marks stale locks as live.
 *
 * @param {object|null} object - The record.
 * @return {boolean} True when an unexpired lock is held.
 */
export function isObjectLocked(object) {
	const lock = readLockPayload(object)
	if (!lock) {
		return false
	}
	const expires = lockExpiryOf(lock)
	return !expires || expires.getTime() > Date.now()
}

/**
 * Who holds the lock, as something you can print.
 *
 * @param {object|null} object - The record.
 * @return {string|null} The holder's display name or uid, or null.
 */
export function lockHolder(object) {
	const lock = readLockPayload(object)
	if (!lock) {
		return null
	}
	return lock.displayName ?? lock.user ?? null
}

/**
 * Whether the CURRENT user holds the lock.
 *
 * Compares against the uid, never the display name: two people can share a
 * display name, and a false positive here is the dangerous direction — it would
 * paint somebody else's lock as your own and offer you an Unlock button for it.
 *
 * Returns false when there is no session (a public page), which is the safe
 * reading for the same reason.
 *
 * @param {object|null} object - The record.
 * @return {boolean} True when the lock belongs to the current user.
 */
export function isLockedByCurrentUser(object) {
	const lock = readLockPayload(object)
	if (!lock) {
		return false
	}
	const uid = getCurrentUser()?.uid
	if (!uid) {
		return false
	}
	return String(lock.user ?? '') === String(uid)
}

/**
 * The whole lock state of a record, resolved once.
 *
 * Preferred over calling the individual helpers in sequence: each of them reads
 * the payload again, and a row renderer calling four of them per row does four
 * times the work for one answer.
 *
 * @param {object|null} object - The record.
 * @return {{locked: boolean, byMe: boolean, holder: string|null, expiresAt: Date|null}} The state.
 */
export function resolveObjectLock(object) {
	const lock = readLockPayload(object)
	if (!lock) {
		return { locked: false, byMe: false, holder: null, expiresAt: null }
	}

	const expiresAt = lockExpiryOf(lock)

	const locked = !expiresAt || expiresAt.getTime() > Date.now()
	if (!locked) {
		return { locked: false, byMe: false, holder: null, expiresAt: null }
	}

	const uid = getCurrentUser()?.uid
	return {
		locked: true,
		byMe: Boolean(uid) && String(lock.user ?? '') === String(uid),
		holder: lock.displayName ?? lock.user ?? null,
		expiresAt,
	}
}
