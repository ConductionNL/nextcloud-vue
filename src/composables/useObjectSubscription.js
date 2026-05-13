// SPDX-License-Identifier: EUPL-1.2
// Copyright (C) 2026 Conduction B.V.

import { tryOnScopeDispose } from '@vueuse/core'
import { isRef, onBeforeUnmount, onMounted, ref, unref, watch } from 'vue'

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
 * @param {string|import('vue').Ref<string>}      type    Object type slug (e.g. `'meeting'`).
 * @param {string|import('vue').Ref<string>|null} [id]    Object UUID for per-object subscription, or `null` for collection.
 * @param {object}      [options]              Optional config.
 * @param {boolean|import('vue').Ref<boolean>} [options.enabled]  Reactive gate; subscribe only when true.
 * @return {{ status: import('vue').Ref<'connecting'|'open'|'closed'>, lastEventAt: import('vue').Ref<Date|null> }}
 *   Reactive subscription diagnostics.
 */
export function useObjectSubscription(objectStore, type, id, options = {}) {
	const status = ref('closed')
	const lastEventAt = ref(null)
	let currentHandle = null

	const readType = () => (isRef(type) ? type.value : type)
	const readId = () => (isRef(id) ? id.value : id)
	const readEnabled = () => {
		const v = options.enabled
		if (v === undefined) return true
		return isRef(v) ? v.value : v
	}

	async function attach() {
		const t = readType()
		if (!t || !readEnabled()) return
		// Idempotent: if we already hold a handle, release it before
		// taking a fresh one. Plugin dedups by event key but the
		// composable's own handle bookkeeping needs the swap.
		if (currentHandle) await detach()
		try {
			currentHandle = await objectStore.subscribe(t, readId() ?? undefined)
			status.value = 'open'
		} catch (e) {
			// liveUpdatesPlugin throws on unknown type; surface in diagnostics
			// without escalating to a render error — most consumers shouldn't
			// crash the page over a subscription failure.
			status.value = 'closed'

			console.warn('[useObjectSubscription] subscribe failed:', e?.message ?? e)
		}
	}

	async function detach() {
		if (!currentHandle) return
		const h = currentHandle
		currentHandle = null
		status.value = 'closed'
		try {
			await objectStore.unsubscribe(h)
		} catch (e) {
			console.warn('[useObjectSubscription] unsubscribe failed:', e?.message ?? e)
		}
	}

	onMounted(attach)

	// Watch any reactive input — re-attach when it changes. We use a
	// single watcher with `() => [readType(), readId(), readEnabled()]`
	// so the reactivity is uniform regardless of which inputs are refs.
	watch(
		() => [unref(type), unref(id), unref(options.enabled ?? true)],
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
