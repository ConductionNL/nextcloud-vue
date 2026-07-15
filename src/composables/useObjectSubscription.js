// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

import { ref, watch, isRef, onMounted, onBeforeUnmount } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'

/**
 * useObjectSubscription — auto-managed live-update subscription.
 *
 * Wraps `objectStore.subscribe(type, id?)` from `liveUpdatesPlugin`
 * with a Vue scope-bound lifecycle: subscribes on mount, releases on
 * unmount, re-subscribes when reactive inputs change.
 *
 * The composable does NOT issue a `fetchObject` on its own — the
 * underlying plugin already triggers a refetch when an
 * `or-object-{uuid}` event arrives, populating
 * `objectStore.objects[type][id]`. Components reading from the
 * store get reactive updates without further plumbing.
 *
 * Use inside a Vue component `setup()` (or any active effect scope).
 *
 * @param {object} objectStore   The Pinia store instance (typically the result of `useObjectStore()`).
 * @param {string|import('vue').Ref<string>|Function}      type    Object type slug (e.g. `'meeting'`), a ref, or a getter.
 * @param {string|import('vue').Ref<string>|Function|null} [id]    Object UUID for per-object subscription (plain, ref, or getter), or `null` for collection.
 * @param {object}      [options]              Optional config.
 * @param {boolean|import('vue').Ref<boolean>|Function} [options.enabled]  Reactive gate (plain, ref, or getter); subscribe only when true.
 * @return {{ status: import('vue').Ref<'connecting'|'open'|'closed'>, lastEventAt: import('vue').Ref<Date|null> }}
 *   Reactive subscription diagnostics.
 */
export function useObjectSubscription(objectStore, type, id, options = {}) {
	const status = ref('closed')
	const lastEventAt = ref(null)
	let currentHandle = null
	// Epoch counter guarding async `subscribe()` resolution (the
	// openregister#402 pattern): every attach() takes a new epoch and
	// every detach() invalidates the current one. When a subscribe()
	// promise resolves under a STALE epoch — the component unmounted or
	// the type/id scope changed while the call was in flight — the
	// freshly returned handle is released immediately instead of being
	// stored, so no subscription leaks past its scope. The same counter
	// collapses double-subscribe races: two overlapping attach() calls
	// leave exactly one live handle (the newest epoch's).
	let epoch = 0

	// Normalise a plain value / ref / getter-function input to its value.
	// Getter support matters: call sites like CnDetailPage pass
	// `() => props.objectId`-style getters so the resolution stays
	// reactive without materialising intermediate refs.
	const readSource = (v) => {
		if (isRef(v)) return v.value
		if (typeof v === 'function') return v()
		return v
	}
	const readType = () => readSource(type)
	const readId = () => readSource(id)
	const readEnabled = () => {
		const v = options.enabled
		if (v === undefined) return true
		return Boolean(readSource(v))
	}

	async function attach() {
		// Stores without live-updates support (created with
		// `liveUpdates: false`, or plain mocks) have no `subscribe`
		// action — stay inert instead of warning on every attach.
		if (typeof objectStore?.subscribe !== 'function') return
		const t = readType()
		if (!t || !readEnabled()) return
		// Idempotent: if we already hold a handle, release it before
		// taking a fresh one. Plugin dedups by event key but the
		// composable's own handle bookkeeping needs the swap.
		if (currentHandle) await detach()
		const myEpoch = ++epoch
		try {
			const handle = await objectStore.subscribe(t, readId() ?? undefined)
			if (myEpoch !== epoch) {
				// Stale resolution: detach() ran (unmount) or a newer
				// attach() superseded this one while subscribe() was in
				// flight. Release the handle we just got — storing it
				// would leak the subscription past its scope.
				try {
					await objectStore.unsubscribe(handle)
				} catch {
					// best-effort release of a stale handle
				}
				return
			}
			currentHandle = handle
			status.value = 'open'
		} catch (e) {
			// liveUpdatesPlugin throws on unknown type; surface in diagnostics
			// without escalating to a render error — most consumers shouldn't
			// crash the page over a subscription failure.
			if (myEpoch === epoch) status.value = 'closed'
			// eslint-disable-next-line no-console
			console.warn('[useObjectSubscription] subscribe failed:', e?.message ?? e)
		}
	}

	async function detach() {
		// Invalidate any in-flight attach() so its late resolution
		// releases its handle instead of storing it (see `epoch`).
		epoch++
		if (!currentHandle) return
		const h = currentHandle
		currentHandle = null
		status.value = 'closed'
		try {
			await objectStore.unsubscribe(h)
		} catch (e) {
			// eslint-disable-next-line no-console
			console.warn('[useObjectSubscription] unsubscribe failed:', e?.message ?? e)
		}
	}

	onMounted(attach)

	// Watch any reactive input — re-attach when it changes. A single
	// watcher over `[readType(), readId(), readEnabled()]` keeps the
	// reactivity uniform regardless of whether inputs are plain values,
	// refs, or getters (reading a getter inside the watch source tracks
	// its reactive dependencies).
	watch(
		() => [readType(), readId(), readEnabled()],
		(_next, prev) => {
			// Skip the initial run — `onMounted` already attached.
			if (prev === undefined) return
			attach()
		},
	)

	// Prefer scope-dispose for cleanup (safe in non-component scopes
	// like a test EffectScope), but ALSO bind onBeforeUnmount directly
	// — some Vue 2.7 + @vue/test-utils v1 paths dispose the component
	// without firing tryOnScopeDispose. Detach is idempotent.
	tryOnScopeDispose(() => detach())
	onBeforeUnmount(() => detach())

	// Track timestamp of the most recent event seen by the underlying
	// plugin. The plugin updates `objectStore.liveLastEventAt`; mirror
	// it locally so consumers can show "Last update: 12s ago" without
	// reaching for the store.
	watch(
		() => objectStore.liveLastEventAt,
		(t) => { if (t) lastEventAt.value = t },
		{ immediate: true },
	)

	return { status, lastEventAt }
}
