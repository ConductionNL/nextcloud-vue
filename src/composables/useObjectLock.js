// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

import { getCurrentUser } from '@nextcloud/auth'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { tryOnScopeDispose } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, unref } from 'vue'

/**
 * Thrown when an `acquire()` POST returns 409 (Conflict) or 423
 * (Locked). Carries the conflicting user info so the UI can render
 * a "Locked by X" banner without a second fetch.
 */
export class LockConflictError extends Error {
	/**
	 * @param {string}      message  Human-readable description.
	 * @param {object|null} info     Lock metadata (`{ user, displayName, expiresAt }`) parsed from the response.
	 */
	constructor(message, info = null) {
		super(message)
		this.name = 'LockConflictError'
		this.lockedBy = info?.user ?? info?.displayName ?? null
		this.expiresAt = info?.expiresAt ?? null
	}
}

/**
 * Thrown when an `acquire()` / `release()` call returns 401 / 403.
 * Consumers may fall back to "edit without lock" UX.
 */
export class PermissionError extends Error {
	constructor(message) {
		super(message)
		this.name = 'PermissionError'
	}
}

/**
 * useObjectLock — manage the OR pessimistic lock for a single object.
 *
 * Reactive lock state is **read from the object cache** populated by
 * `liveUpdatesPlugin`, NOT from a polling lock endpoint. This means
 * remote lock acquisitions are visible without explicit refetch as
 * long as the consumer also uses `useObjectSubscription` (or any
 * other path that keeps `objectStore.objects[type][id]` fresh).
 *
 * @param {object} objectStore  Pinia store instance (`useObjectStore()` result).
 * @param {string|import('vue').Ref<string>}      register OR register slug.
 * @param {string|import('vue').Ref<string>}      schema   OR schema slug (also the GraphQL field name).
 * @param {string|import('vue').Ref<string>}      id       Object UUID.
 * @param {object}  [options]  Optional config.
 * @param {boolean} [options.autoRenew]      Renew the lock on a fixed interval while editing + visible.
 * @param {number}  [options.renewIntervalMs]  Renew every N ms (default 10 min).
 * @param {number}  [options.lockDurationSec]   Server-side TTL requested on acquire (default 30 min).
 * @return {{
 *   locked: import('vue').ComputedRef<boolean>,
 *   lockedByMe: import('vue').ComputedRef<boolean>,
 *   lockedBy: import('vue').ComputedRef<string|null>,
 *   expiresAt: import('vue').ComputedRef<Date|null>,
 *   acquire: () => Promise<void>,
 *   release: () => Promise<void>
 * }} Reactive lock state + actions.
 */
export function useObjectLock(objectStore, register, schema, id, options = {}) {
	const autoRenew = options.autoRenew !== false
	const renewIntervalMs = options.renewIntervalMs ?? 600000
	const lockDurationSec = options.lockDurationSec ?? 1800

	// Use native document.visibilityState directly to avoid pinning a
	// minimum @vueuse/core version (`useDocumentVisibility` landed in a
	// later cut and isn't available everywhere).
	const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
	let renewTimer = null

	function readType() {
		return unref(schema)
	}
	function readId() {
		return unref(id)
	}
	function readRegister() {
		return unref(register)
	}

	function readSelfLock() {
		const t = readType()
		const i = readId()
		if (!t || !i) return null
		const obj = objectStore.objects?.[t]?.[i]
		const self = obj?.['@self'] ?? obj
		return self?.locked ?? null
	}

	const locked = computed(() => {
		const l = readSelfLock()
		if (!l) return false
		if (l.expiresAt) {
			const exp = new Date(l.expiresAt).getTime()
			if (Number.isFinite(exp) && exp <= Date.now()) return false
		}
		return true
	})

	const lockedBy = computed(() => readSelfLock()?.user ?? readSelfLock()?.displayName ?? null)

	const lockedByMe = computed(() => {
		const me = getCurrentUser()?.uid
		const lb = readSelfLock()?.user
		return Boolean(me && lb && me === lb)
	})

	const expiresAt = computed(() => {
		const raw = readSelfLock()?.expiresAt
		if (!raw) return null
		const d = new Date(raw)
		return Number.isNaN(d.getTime()) ? null : d
	})

	function endpoint() {
		const r = readRegister()
		const s = readType()
		const i = readId()
		return generateUrl(`/apps/openregister/api/objects/${encodeURIComponent(r)}/${encodeURIComponent(s)}/${encodeURIComponent(i)}/lock`)
	}

	async function acquire() {
		try {
			await axios.post(endpoint(), { duration: lockDurationSec })
		} catch (e) {
			const status = e?.response?.status
			const data = e?.response?.data
			if (status === 409 || status === 423) {
				throw new LockConflictError(
					data?.message || 'Object is locked by another user',
					data?.lock || data,
				)
			}
			if (status === 401 || status === 403) {
				throw new PermissionError(data?.message || 'No permission to lock this object')
			}
			throw e
		}
		// Refresh the cached object so `@self.locked` is populated;
		// liveUpdatesPlugin will also fire a refetch on the
		// or-object-{uuid} event, but doing it here avoids a render
		// gap between acquire() resolution and the push frame.
		try {
			await objectStore.fetchObject(readType(), readId())
		} catch {
			// swallow — the lock is held; the cache will catch up
		}
		if (autoRenew) startRenewTimer()
	}

	async function release() {
		stopRenewTimer()
		try {
			await axios.delete(endpoint())
		} catch (e) {
			const status = e?.response?.status
			if (status === 404) return // already released; idempotent
			if (status === 401 || status === 403) {
				throw new PermissionError(e?.response?.data?.message || 'No permission to release this lock')
			}
			throw e
		}
		try {
			await objectStore.fetchObject(readType(), readId())
		} catch { /* ignore */ }
	}

	function startRenewTimer() {
		stopRenewTimer()
		if (!autoRenew) return
		renewTimer = setInterval(() => {
			if (!isVisible()) return
			if (!lockedByMe.value) {
				stopRenewTimer()
				return
			}
			// Re-issue acquire; idempotent on the server (resets TTL).
			acquire().catch(() => stopRenewTimer())
		}, renewIntervalMs)
	}

	function stopRenewTimer() {
		if (renewTimer) {
			clearInterval(renewTimer)
			renewTimer = null
		}
	}

	function beaconRelease() {
		if (!lockedByMe.value) return
		try {
			navigator.sendBeacon?.(endpoint() + '?_method=DELETE')
		} catch { /* best-effort */ }
	}

	onMounted(() => {
		window.addEventListener('beforeunload', beaconRelease)
	})

	onBeforeUnmount(() => {
		window.removeEventListener('beforeunload', beaconRelease)
	})

	tryOnScopeDispose(() => {
		stopRenewTimer()
		if (lockedByMe.value) {
			// Fire-and-forget; the Vue scope is gone, no point awaiting.
			release().catch(() => {})
		}
	})

	return { locked, lockedByMe, lockedBy, expiresAt, acquire, release }
}
