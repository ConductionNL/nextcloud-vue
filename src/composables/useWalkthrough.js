/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

import { ref, computed } from 'vue'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

/**
 * Per-`appId` cache so all consumers of one app share a single walkthrough
 * machine + persisted progress for the page lifetime (mirrors useSetupStatus).
 */
const cache = new Map()

/**
 * localStorage key prefix for the per-browser mirror of the last-seen version.
 * The AUTHORITATIVE store is the per-user server preference addressed by
 * `manifest.walkthrough.completionConfigKey`; this is the synchronous cache /
 * offline fallback so the tour never flashes before the GET resolves.
 */
export const WALKTHROUGH_SEEN_STORAGE_PREFIX = 'cn-walkthrough-seen:'

/**
 * Build the per-user preferences endpoint for a walkthrough completion key.
 * Read (`GET`) and write (`PUT`) MUST address the same URL — a persist that
 * lands on a different key reads back as "never seen" forever.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {string} configKey `manifest.walkthrough.completionConfigKey`.
 * @return {string} The generated `/apps/{appId}/api/preferences/{key}` URL.
 */
export function walkthroughPreferenceUrl(appId, configKey) {
	return generateUrl('/apps/' + appId + '/api/preferences/' + configKey)
}

/**
 * Normalise a stored completion value into the string the version engine
 * compares against.
 *
 * Only `null` / `undefined` / `''` mean "never seen". Anything else counts as
 * seen — including the JS-falsy scalars `false`, `0` and `'0'`, which a plain
 * truthiness check would misread as a fresh user and re-open the tour on every
 * visit. This is the read-side counterpart of `persistWalkthroughSeenVersion`.
 *
 * @param {*} value The raw stored / API value.
 * @return {string} The last-seen version, or `''` when never seen.
 */
export function normaliseSeenVersion(value) {
	if (value === null || value === undefined) return ''
	if (typeof value === 'string') return value
	return String(value)
}

/**
 * Resolve the injectable `localStorage` backend (null in SSR / locked-down
 * browsers, where persistence degrades to session-only).
 *
 * @param {Storage} [injected] Test-injected storage.
 * @return {Storage|null} The storage backend or null.
 */
function resolveStorage(injected) {
	if (injected) return injected
	if (typeof window === 'undefined') return null
	try {
		return window.localStorage
	} catch (e) {
		return null
	}
}

/**
 * Read the per-browser mirror of the last-seen walkthrough version.
 * Synchronous, so callers can seed state before the server GET resolves.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {Storage} [storage] Injectable storage backend.
 * @return {string} The last-seen version, or `''`.
 */
export function readLocalWalkthroughSeenVersion(appId, storage) {
	const s = resolveStorage(storage)
	if (!s) return ''
	try {
		return normaliseSeenVersion(s.getItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + appId))
	} catch (e) {
		return ''
	}
}

/**
 * Write the per-browser mirror of the last-seen walkthrough version.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {string} version The version to record.
 * @param {Storage} [storage] Injectable storage backend.
 * @return {void}
 */
function writeLocalWalkthroughSeenVersion(appId, version, storage) {
	const s = resolveStorage(storage)
	if (!s) return
	try {
		s.setItem(WALKTHROUGH_SEEN_STORAGE_PREFIX + appId, version)
	} catch (e) {
		/* quota / private mode — persistence is best-effort */
	}
}

/**
 * Type guard — true for a plain (non-null, non-array) object. Used to reject
 * the SPA index HTML Nextcloud returns (with status 200) when an app does not
 * actually serve `/api/preferences/{key}`.
 *
 * @param {*} value Candidate.
 * @return {boolean} True when value is a plain object.
 */
function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Load the user's last-seen walkthrough version (ADR-043, REQ-WALK-NV-004).
 *
 * The per-USER server preference addressed by `completionConfigKey` is
 * authoritative (cross-device); the localStorage mirror is the fallback used
 * when no key is declared, the endpoint is absent, or the request fails. A
 * `{ value: null }` response is a definitive "never seen" and correctly yields
 * the local mirror (usually `''`).
 *
 * @param {string} appId The Nextcloud app id.
 * @param {string} configKey `manifest.walkthrough.completionConfigKey` (may be empty).
 * @param {object} [options] `{ http, storage }` injection points for tests.
 * @return {Promise<string>} The last-seen version, or `''` for a fresh user.
 */
export async function loadWalkthroughSeenVersion(appId, configKey, options = {}) {
	const local = readLocalWalkthroughSeenVersion(appId, options.storage)
	if (!configKey) return local
	const http = options.http || axios
	try {
		const { data } = await http.get(walkthroughPreferenceUrl(appId, configKey))
		// Only a real preferences payload counts. An HTML string (SPA fallback
		// from an app that doesn't serve the route) is NOT a "never seen"
		// signal — fall back to the local mirror instead.
		if (!isPlainObject(data) || !('value' in data)) return local
		const seen = normaliseSeenVersion(data.value)
		if (seen) {
			writeLocalWalkthroughSeenVersion(appId, seen, options.storage)
			return seen
		}
		return local
	} catch (e) {
		// Unauthenticated / endpoint missing / offline.
		return local
	}
}

/**
 * Persist the user's last-seen walkthrough version (ADR-043, REQ-WALK-NV-006).
 *
 * Writes the localStorage mirror synchronously AND `PUT`s the same
 * `completionConfigKey` preference the load path reads, so a returning user —
 * on this browser or any other — is not shown the tour again. Never throws:
 * a failed write only means the tour may re-open elsewhere.
 *
 * @param {string} appId The Nextcloud app id.
 * @param {string} configKey `manifest.walkthrough.completionConfigKey` (may be empty).
 * @param {string} version The app version to record as seen.
 * @param {object} [options] `{ http, storage }` injection points for tests.
 * @return {Promise<boolean>} True when the server preference was written.
 */
export function persistWalkthroughSeenVersion(appId, configKey, version, options = {}) {
	const value = normaliseSeenVersion(version)
	writeLocalWalkthroughSeenVersion(appId, value, options.storage)
	if (!configKey) return Promise.resolve(false)
	const http = options.http || axios
	try {
		return Promise.resolve(http.put(walkthroughPreferenceUrl(appId, configKey), { value }))
			.then(() => true)
			.catch(() => false)
	} catch (e) {
		return Promise.resolve(false)
	}
}

/**
 * Compare two semver-ish strings. Missing / unparseable parts sort as 0.
 *
 * @param {string} a Left version.
 * @param {string} b Right version.
 * @return {number} -1 / 0 / 1.
 */
export function compareSemver(a, b) {
	const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0)
	const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0)
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] || 0) - (pb[i] || 0)
		if (d !== 0) return d < 0 ? -1 : 1
	}
	return 0
}

/**
 * Replace `{{var}}` tokens in a string from a context bag. Unknown keys are
 * left intact (and warned in dev) so a misauthored tour degrades visibly.
 *
 * @param {string} input The template string.
 * @param {object} context The context bag.
 * @return {string} The interpolated string.
 */
export function interpolateTokens(input, context) {
	if (typeof input !== 'string' || input.indexOf('{{') === -1) return input
	return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, key) => {
		if (context && Object.prototype.hasOwnProperty.call(context, key) && context[key] != null) {
			return String(context[key])
		}
		return m
	})
}

/**
 * Walkthrough engine (ADR-043). Loads `manifest.walkthrough`, composes the
 * active tour for the current user + app version, and runs a step machine whose
 * advancement is fed declarative *signals* (route change, object created,
 * element appeared, click, delay) by the rendering component — keeping this
 * composable pure and unit-testable. Captured route params / object ids land in
 * a context bag interpolated into later steps via `{{var}}`.
 *
 * Persistence is decoupled: pass `seenVersion` (the user's last-seen app version)
 * and an `onComplete(appVersion)` callback. CnAppRoot wires these to the per-user
 * `manifest.walkthrough.completionConfigKey` preference via
 * {@link loadWalkthroughSeenVersion} / {@link persistWalkthroughSeenVersion}.
 *
 * @param {string} appId The Nextcloud app id (cache key).
 * @param {object} manifest The app manifest (reads `manifest.walkthrough` + `manifest.version`).
 * @param {object} [options] `{ appVersion, seenVersion, resume, onComplete }`.
 * @return {object} The reactive machine + controls (see properties below).
 *
 * @example
 * const wt = useWalkthrough('pipelinq', manifest, { seenVersion: '1.0.0' })
 * wt.start('getting-started')
 * wt.notify({ kind: 'route', route: 'Products', params: { id: '42' } })
 */
export function useWalkthrough(appId, manifest, options = {}) {
	let entry = cache.get(appId)
	if (!entry) {
		const walkthrough = (manifest && manifest.walkthrough) || {}
		const appVersion = options.appVersion || (manifest && manifest.version) || '0.0.0'
		// Normalised, NOT `|| ''`: a completed user whose recorded version is a
		// JS-falsy scalar (`0` / `false`) must still read as "has seen it".
		const seenVersion = normaliseSeenVersion(options.seenVersion)
		const enabled = walkthrough.enabled !== false && Array.isArray(walkthrough.tours) && walkthrough.tours.length > 0

		const tours = walkthrough.tours || []
		const activeTourId = ref(null)
		const currentIndex = ref(0)
		const context = ref({})
		const running = ref(false)
		// True while a user-initiated replay is active (the "Restart tutorial"
		// entry). A replay shows the FULL tour regardless of the persisted
		// seen-version — otherwise a returning user, whose seenVersion already
		// covers every step's sinceVersion, would replay an empty tour.
		const replaying = ref(false)

		/**
		 * Compose the step set for a tour, filtered by version: a fresh user
		 * (no seenVersion) gets all steps `<= appVersion`; an upgraded user gets
		 * only steps newer than seenVersion and `<= appVersion`. A user-initiated
		 * replay (`replaying`) ignores seenVersion and shows every step
		 * `<= appVersion`.
		 *
		 * @param {object} tour The tour definition.
		 * @return {Array} The visible steps for this user.
		 */
		function composeSteps(tour) {
			const all = Array.isArray(tour.steps) ? tour.steps : []
			return all.filter((s) => {
				const since = s.sinceVersion || '0.0.0'
				if (compareSemver(since, appVersion) > 0) return false
				if (!replaying.value && seenVersion && compareSemver(since, seenVersion) <= 0) return false
				return true
			})
		}

		const activeTour = computed(() => {
			if (!activeTourId.value) return null
			const tour = tours.find((t) => t.id === activeTourId.value)
			if (!tour) return null
			return { ...tour, steps: composeSteps(tour) }
		})

		/**
		 * The tour that should auto-start for this user, or null. A
		 * `version-bump` tour only qualifies when it has a non-empty step delta;
		 * `first-visit` qualifies only when the user has never seen the tour.
		 *
		 * @return {object|null} The auto-start tour (raw definition) or null.
		 */
		const autoStartTour = computed(() => {
			if (!enabled) return null
			for (const tour of tours) {
				if (tour.minAppVersion && compareSemver(appVersion, tour.minAppVersion) < 0) continue
				const steps = composeSteps(tour)
				if (steps.length === 0) continue
				if (tour.trigger === 'first-visit' && !seenVersion) return tour
				if (tour.trigger === 'version-bump' && seenVersion && compareSemver(appVersion, seenVersion) > 0) return tour
			}
			return null
		})

		const currentStep = computed(() => {
			const t = activeTour.value
			if (!t) return null
			const raw = t.steps[currentIndex.value]
			if (!raw) return null
			return interpolateStep(raw, context.value)
		})
		const totalSteps = computed(() => (activeTour.value ? activeTour.value.steps.length : 0))
		const isFirst = computed(() => currentIndex.value === 0)
		const isLast = computed(() => totalSteps.value > 0 && currentIndex.value === totalSteps.value - 1)

		/**
		 * Apply `{{var}}` interpolation to a step's user-facing + targeting fields.
		 *
		 * @param {object} step The raw step.
		 * @param {object} ctx The context bag.
		 * @return {object} A shallow copy with tokens resolved.
		 */
		function interpolateStep(step, ctx) {
			const out = { ...step }
			for (const k of ['title', 'body', 'task']) {
				if (out[k]) out[k] = interpolateTokens(out[k], ctx)
			}
			if (out.target) {
				out.target = { ...out.target }
				if (out.target.ref) out.target.ref = interpolateTokens(out.target.ref, ctx)
				if (out.target.selector) out.target.selector = interpolateTokens(out.target.selector, ctx)
			}
			if (out.advanceOn) {
				out.advanceOn = { ...out.advanceOn }
				if (out.advanceOn.route) out.advanceOn.route = interpolateTokens(out.advanceOn.route, ctx)
			}
			return out
		}

		/**
		 * Run a step's `advanceOn.capture` against captured values.
		 *
		 * @param {object} step The active (raw) step.
		 * @param {object} source `{ params?, object? }` to read captured values from.
		 * @return {void}
		 */
		function runCapture(step, source) {
			const cap = step && step.advanceOn && step.advanceOn.capture
			if (!cap) return
			const next = { ...context.value }
			for (const [varName, token] of Object.entries(cap)) {
				const key = String(token).replace(/^:/, '')
				let value
				if (source.params && key in source.params) value = source.params[key]
				else if (source.object) value = (key === 'id') ? (source.object.id ?? source.object['@self']?.id ?? source.object.uuid) : source.object[key]
				if (value != null) next[varName] = value
			}
			context.value = next
		}

		/**
		 * Advance to the next step, or complete on the last step. Skips
		 * subsequent `optional` steps whose target ref is empty after interpolation.
		 *
		 * @return {void}
		 */
		function next() {
			if (!activeTour.value) return
			if (currentIndex.value >= totalSteps.value - 1) {
				complete()
				return
			}
			currentIndex.value += 1
		}
		/**
		 * Step back (no-op on the first step).
		 *
		 * @return {void}
		 */
		function back() {
			if (currentIndex.value > 0) currentIndex.value -= 1
		}
		/**
		 * Skip the active step (advance without satisfying its condition).
		 *
		 * @return {void}
		 */
		function skip() {
			next()
		}
		/**
		 * Jump to a step by id within the active tour.
		 *
		 * @param {string} stepId The target step id.
		 * @return {void}
		 */
		function jumpTo(stepId) {
			if (!activeTour.value) return
			const idx = activeTour.value.steps.findIndex((s) => s.id === stepId)
			if (idx >= 0) currentIndex.value = idx
		}
		/**
		 * Start a tour by id at its first (resume) step.
		 *
		 * @param {string} tourId The tour id.
		 * @param {number} [startIndex] Optional resume index.
		 * @return {void}
		 */
		function start(tourId, startIndex = 0) {
			replaying.value = false
			activeTourId.value = tourId
			currentIndex.value = startIndex
			context.value = {}
			running.value = true
		}
		/**
		 * Restart a tour from the beginning (used by the "Restart tutorial" /
		 * "Replay" entry). Runs in replay mode so the FULL tour shows even for a
		 * returning user whose persisted seen-version already covers every step.
		 *
		 * @param {string} tourId The tour id.
		 * @return {void}
		 */
		function restart(tourId) {
			start(tourId, 0)
			replaying.value = true
		}
		/**
		 * Dismiss the active tour without marking it complete.
		 *
		 * @return {void}
		 */
		function dismiss() {
			running.value = false
			activeTourId.value = null
			replaying.value = false
		}
		/**
		 * Mark the active tour complete: stop running and invoke the
		 * `onComplete(appVersion)` persistence callback so the seen version is
		 * recorded by the consumer (CnAppRoot).
		 *
		 * @return {void}
		 */
		function complete() {
			running.value = false
			activeTourId.value = null
			replaying.value = false
			if (typeof options.onComplete === 'function') options.onComplete(appVersion)
		}

		/**
		 * Feed a declarative advance signal to the active step. When the signal
		 * satisfies the step's `advanceOn`, captures run and the tour advances.
		 *
		 * @param {object} signal `{ kind: 'route'|'object-created'|'element'|'click'|'delay', route?, params?, object? }`.
		 * @return {boolean} Whether the signal advanced the tour.
		 */
		function notify(signal) {
			const step = activeTour.value && activeTour.value.steps[currentIndex.value]
			if (!step || !step.advanceOn) return false
			const a = step.advanceOn
			let match = false
			if (signal.kind === 'route' && a.type === 'route-match') {
				match = signal.route === a.route
				if (match) runCapture(step, { params: signal.params || {} })
			} else if (signal.kind === 'object-created' && a.type === 'object-created') {
				const obj = signal.object || {}
				const reg = obj.register ?? obj['@self']?.register
				const sch = obj.schema ?? obj['@self']?.schema
				match = (!a.register || reg === a.register) && (!a.schema || sch === a.schema)
				if (match) runCapture(step, { object: obj })
			} else if (signal.kind === 'element' && a.type === 'element-appears') {
				match = true
			} else if (signal.kind === 'click' && a.type === 'click-target') {
				match = true
			} else if (signal.kind === 'delay' && a.type === 'delay') {
				match = true
			}
			if (match) next()
			return match
		}

		entry = {
			enabled,
			appVersion,
			seenVersion,
			tours,
			activeTour,
			autoStartTour,
			currentStep,
			totalSteps,
			isFirst,
			isLast,
			context,
			running,
			replaying,
			start,
			restart,
			next,
			back,
			skip,
			jumpTo,
			dismiss,
			complete,
			notify,
			interpolate: (s) => interpolateTokens(s, context.value),
		}
		cache.set(appId, entry)

		// Resume token (cross-app hand-off / refresh) — start at the resume step.
		if (options.resume && options.resume.tourId) {
			const tour = tours.find((t) => t.id === options.resume.tourId)
			if (tour) {
				const steps = composeSteps(tour)
				const idx = Math.max(0, steps.findIndex((s) => s.id === options.resume.stepId))
				start(options.resume.tourId, idx)
			}
		}
	}

	return entry
}

/**
 * Test-only helper to reset the per-`appId` cache.
 *
 * @internal
 */
export function __resetWalkthroughCacheForTests() {
	cache.clear()
}
