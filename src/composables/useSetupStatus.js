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
 * One error is treated as an answer rather than a failure: a **401/403** means
 * the caller may not read setup state (setup endpoints are admin-only), so
 * `completed` reports `true` and the wizard stays out of the way. Without that,
 * every non-admin user of an app with a `setup` block met a wizard they had no
 * permission to complete instead of the app itself.
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
 *   forbidden: import('vue').Ref<boolean>,
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
			// Set when the server answers 401/403 — see `completed` below.
			forbidden: ref(false),
			fetched: false,
		}
		cache.set(appId, entry)
	}
	const { status, loading, error, forbidden } = entry

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
	// `forbidden` empties BOTH lists, and that is what actually suppresses the
	// wizard: CnAppRoot gates on `requiredUnmet.length > 0` (blocking) and on
	// `requiredUnmet.length === 0 && optionalUnmet.length > 0` (auto-open) —
	// it never reads `completed`. A caller who may not READ setup state has no
	// unmet setup work *of their own*, so reporting steps as unmet to them
	// described work they could neither see nor do.
	const requiredUnmet = computed(() => (forbidden.value === true
		? []
		: steps.value.filter((s) => isActionable(s) && requiredById[s.id] && !s.done)))
	const optionalUnmet = computed(() => (forbidden.value === true
		? []
		: steps.value.filter((s) => isActionable(s) && !requiredById[s.id] && !s.done)))
	const completed = computed(() => {
		if (!enabled) {
			return true
		}
		// A 401/403 means the caller may not READ setup state — first-time setup
		// is admin-only. That is not "setup is unfinished"; it is "not this
		// user's concern". Reporting incomplete here put every non-admin in
		// front of a setup wizard they cannot complete, INSTEAD of the app:
		// `/api/setup/status` answers 200 {completed:true} to an admin and 403
		// to everyone else, and the generic error path below then left status at
		// its "nothing done" default. Measured on openbuild, where it made the
		// app unusable for every non-admin as soon as they could see it at all.
		if (forbidden.value === true) {
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
			forbidden.value = false
		} catch (err) {
			error.value = err
			// 401/403 is a DIFFERENT outcome from a failed lookup: the server
			// answered, and its answer was "you may not see this". Setup is
			// admin-only, so for everyone else it is settled, not unknown.
			// Anything else (network error, 500) stays unknown and falls back to
			// "nothing done" so the wizard is still reachable for an admin.
			const httpStatus = err && err.response && err.response.status
			forbidden.value = (httpStatus === 401 || httpStatus === 403)
		} finally {
			loading.value = false
			entry.fetched = true
		}
	}

	if (!entry.fetched) {
		refresh()
	}

	return { steps, status, requiredUnmet, optionalUnmet, completed, enabled, loading, error, forbidden, refresh }
}

/**
 * Test-only helper to reset the per-`appId` cache.
 *
 * @internal
 */
export function __resetSetupStatusCacheForTests() {
	cache.clear()
}
