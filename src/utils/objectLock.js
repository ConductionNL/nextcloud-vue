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
	if (!object || typeof object !== 'object') return null
	const self = object['@self'] ?? object
	const lock = self?.locked
	if (!lock || typeof lock !== 'object') return null
	return lock
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
	if (!lock) return false
	if (lock.expiresAt) {
		const expires = new Date(lock.expiresAt).getTime()
		if (Number.isFinite(expires) && expires <= Date.now()) return false
	}
	return true
}

/**
 * Who holds the lock, as something you can print.
 *
 * @param {object|null} object - The record.
 * @return {string|null} The holder's display name or uid, or null.
 */
export function lockHolder(object) {
	const lock = readLockPayload(object)
	if (!lock) return null
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
	if (!lock) return false
	const uid = getCurrentUser()?.uid
	if (!uid) return false
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

	let expiresAt = null
	if (lock.expiresAt) {
		const parsed = new Date(lock.expiresAt)
		if (Number.isFinite(parsed.getTime())) expiresAt = parsed
	}

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
