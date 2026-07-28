/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { ref, computed } from 'vue'

/**
 * Per-`appId` cache of setup-status results. The Vue refs are stored so all
 * consumers of the same app share one fetch + reactive state for the page
 * lifetime (mirrors useAppStatus).
 */
const cache = new Map()

/**
 * Composable that reports an app's first-time-setup status (ADR-042).
 *
 * Fetches `GET /apps/{appId}/api/setup/status` → `{ version, completed, steps:
 * { <id>: { done, detail } } }`, then cross-references the manifest's
 * `setup.steps[].required` flags so `CnAppRoot` can gate on required-unmet and
 * the wizard can drive itself. On error it falls back to "nothing done" so a
 * failed lookup never crashes the shell — the wizard simply shows the steps.
 *
 * @param {string} appId Nextcloud app id (e.g. `"procest"`).
 * @param {object} manifest The app manifest (reads `manifest.setup`).
 * @return {{
 *   steps: import('vue').ComputedRef<Array<object>>,
 *   status: import('vue').Ref<object>,
 *   requiredUnmet: import('vue').ComputedRef<Array<object>>,
 *   optionalUnmet: import('vue').ComputedRef<Array<object>>,
 *   completed: import('vue').ComputedRef<boolean>,
 *   enabled: boolean,
 *   loading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<Error|null>,
 *   refresh: () => Promise<void>
 * }}
 *
 * @example
 * const { requiredUnmet, completed, loading } = useSetupStatus('procest', manifest)
 */
export function useSetupStatus(appId, manifest) {
	const setup = (manifest && manifest.setup) || {}
	const enabled = setup.enabled !== false && Array.isArray(setup.steps) && setup.steps.length > 0
	const stepDefs = Array.isArray(setup.steps) ? setup.steps : []
	const requiredById = Object.create(null)
	for (const s of stepDefs) {
		requiredById[s.id] = s.required === true
	}

	let entry = cache.get(appId)
	if (!entry) {
		entry = {
			status: ref({ version: null, completed: false, steps: {} }),
			loading: ref(enabled),
			error: ref(null),
			fetched: false,
		}
		cache.set(appId, entry)
	}
	const { status, loading, error } = entry

	const steps = computed(() => stepDefs.map((s) => {
		const st = (status.value.steps && status.value.steps[s.id]) || {}
		return { ...s, done: st.done === true, detail: st.detail }
	}))
	// Presentational step types carry no work, so the server never reports a
	// `done` flag for them. Counting them as "unmet" made `optionalUnmet`
	// permanently non-empty for any manifest with a welcome/summary step,
	// which kept CnAppRoot's non-gating setup wizard auto-opening over the
	// app on every fresh browser profile no matter how complete setup was.
	// Only actionable steps can be unmet.
	const isActionable = (s) => s.type !== 'info' && s.type !== 'summary'
	const requiredUnmet = computed(() => steps.value.filter((s) => isActionable(s) && requiredById[s.id] && !s.done))
	const optionalUnmet = computed(() => steps.value.filter((s) => isActionable(s) && !requiredById[s.id] && !s.done))
	const completed = computed(() => {
		if (!enabled) {
			return true
		}
		// Authoritative server flag, but never report complete while a required
		// step is still unmet (defends against a stale completion flag).
		return status.value.completed === true && requiredUnmet.value.length === 0
	})

	/**
	 * (Re)fetch the setup status from the server.
	 *
	 * @return {Promise<void>}
	 */
	async function refresh() {
		if (!enabled) {
			loading.value = false
			entry.fetched = true
			return
		}
		loading.value = true
		error.value = null
		try {
			const [{ default: axios }, { generateUrl }] = await Promise.all([
				import('@nextcloud/axios'),
				import('@nextcloud/router'),
			])
			const { data } = await axios.get(generateUrl(`/apps/${appId}/api/setup/status`))
			status.value = (data && typeof data === 'object') ? data : { steps: {} }
		} catch (err) {
			error.value = err
			// Leave status at its default (nothing done) — never crash the shell.
		} finally {
			loading.value = false
			entry.fetched = true
		}
	}

	if (!entry.fetched) {
		refresh()
	}

	return { steps, status, requiredUnmet, optionalUnmet, completed, enabled, loading, error, refresh }
}

/**
 * Test-only helper to reset the per-`appId` cache.
 *
 * @internal
 */
export function __resetSetupStatusCacheForTests() {
	cache.clear()
}
