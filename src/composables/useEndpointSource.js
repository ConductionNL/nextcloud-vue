/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * useEndpointSource — ONE coherent endpoint data binding for the abstract
 * widgets (stat / delta / chart / object-table). A manifest-authored
 * `endpointSource` block reads an arbitrary app REST endpoint (a bespoke
 * analytics controller, a summary aggregation OpenRegister can't express)
 * and hands the widget the payload at a dot-path of the response:
 *
 * ```js
 * endpointSource: {
 *   url: '/apps/pipelinq/api/analytics/overview', // app-relative (generateUrl) or absolute path
 *   method: 'GET',                                // 'GET' (default) | 'POST' (params become the JSON body)
 *   params: { period: '@workspace.datePreset?' }, // SAME token grammar as widget filters
 *   responsePath: 'summary',                      // dot-path pluck of the payload (default: whole body)
 * }
 * ```
 *
 * `params` values pass through the SAME token resolution widget filters use
 * (`resolveFilterTokens`): `@me`, `@today` / `@today±Nd`, `@monthStart`,
 * `@workspace.<key>` / `@config.<key>` (with the trailing-`?` OPTIONAL
 * convention — an unresolved optional param is dropped, an unresolved
 * REQUIRED one blocks the fetch), `@objectId` / `@object.<field>` on detail
 * pages. The `url` itself may interpolate `@page.*` / `@workspace.*` /
 * `@config.*` / `@objectId` / `@object.*` tokens inline (unresolved URL
 * tokens collapse to an empty string so a literal `@page.period` never hits
 * the wire).
 *
 * Requests are SHARED: one in-flight promise + short-TTL cache entry per
 * `(method, url, resolved params)` — the same per-period caching semantics
 * pipelinq's `dashboardData.js` used, so four KPI tiles reading the same
 * overview endpoint issue ONE request per render pass. `responsePath`
 * plucking happens per subscriber, after the shared response resolves.
 *
 * Refresh signal — grounded in the library's own event-bus channels (the
 * mechanism `CnActionsMenu` broadcasts on): the composable subscribes to
 * `cn:page:refresh` (the page-level Refresh action → every endpoint source
 * force-refetches past the cache) and, when a `widgetId` option is given,
 * to `cn:widget:refresh` with a matching `widgetId` payload (the per-widget
 * Refresh action). App-LOCAL refresh signals (e.g. a `Vue.observable` token
 * like pipelinq's `refreshDashboardData()`) are not observable from the
 * library — for those, pass the reactive token as the `refreshKey` option
 * and bump it; every bump force-refetches.
 *
 * @module composables/useEndpointSource
 */

import { computed, getCurrentScope, onScopeDispose, ref, unref, watch } from 'vue'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import {
	dropOptionalUnresolved,
	hasUnresolvedTokens,
	resolveFilterTokens,
} from '../utils/resolveFilterTokens.js'

/**
 * Cache TTL for shared endpoint responses — 5 minutes, matching the
 * per-period dashboard cache the fleet apps used (pipelinq dashboardData.js).
 *
 * @type {number}
 */
export const ENDPOINT_SOURCE_TTL_MS = 5 * 60 * 1000

/**
 * Minimum time a FORCED refetch (a Refresh action, a `refreshKey` bump) keeps
 * `loading` true. A refresh against a fast endpoint settles in a few
 * milliseconds — too briefly for the widget's loading state to be perceived,
 * so the click reads as having done nothing. Only the loading FLAG is held;
 * the fresh data lands the moment the response arrives. Initial and
 * signature-change loads are not held — first paint should never wait.
 *
 * @type {number}
 */
export const MIN_FORCED_LOADING_MS = 400

/** Event-bus channel the page-level Refresh action broadcasts on. */
const PAGE_REFRESH_CHANNEL = 'cn:page:refresh'

/** Event-bus channel the per-widget Refresh action broadcasts on. */
const WIDGET_REFRESH_CHANNEL = 'cn:widget:refresh'

/**
 * Module-level response cache: cacheKey → `{ promise, timestamp }`.
 * Shared across every widget instance in the page so identical requests
 * dedupe to one in-flight promise (pipelinq `cached()` semantics: an
 * errored fetch drops its entry so the next mount retries).
 *
 * @type {Map<string, {promise: Promise<*>, timestamp: number}>}
 */
const responseCache = new Map()

/**
 * Read a dot-path off an object (e.g. `"data.totalLeads"`, `"series.0.value"`).
 * Returns the object itself for an empty path and `undefined` when any
 * segment is missing.
 *
 * @param {*} obj The source object.
 * @param {string} [path] The dot-path.
 * @return {*} The resolved value or undefined.
 */
export function getByPath(obj, path) {
	if (path === undefined || path === null || path === '') return obj
	return String(path).split('.').reduce(
		(o, k) => (o == null ? undefined : o[k]),
		obj,
	)
}

/**
 * Interpolate `@page.<key>` / `@workspace.<key>` / `@config.<key>` /
 * `@objectId` / `@object.<field>` tokens inside a URL string against the
 * token context. `@page.*` is an alias for `@workspace.*` (both read the
 * page-level workspace context). Unresolved tokens collapse to an empty
 * string so a half-built URL never sends a literal `@page.period`.
 *
 * @param {string} str The raw URL (or any string) to interpolate.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] The token context.
 * @return {string} The interpolated string.
 */
export function interpolateUrlTokens(str, ctx) {
	if (typeof str !== 'string') return str
	const c = ctx || {}
	const workspace = c.workspace || {}
	const config = c.config || {}
	return str.replace(/@(page|workspace)\.([A-Za-z0-9_]+)/g, (_, _ns, key) => {
		const v = workspace[key]
		return (v === undefined || v === null) ? '' : String(v)
	}).replace(/@config\.([A-Za-z0-9_]+)/g, (_, key) => {
		const v = config[key]
		return (v === undefined || v === null) ? '' : String(v)
	}).replace(/@objectId/g, () => {
		const id = c.objectId
		return (id === undefined || id === null) ? '' : String(id)
	}).replace(/@object\.([A-Za-z0-9_]+)/g, (_, field) => {
		const v = c.object && c.object[field]
		return (v === undefined || v === null) ? '' : String(v)
	})
}

/**
 * Resolve an `endpointSource` config against a token context into a concrete
 * request descriptor. `params` run through the SAME `resolveFilterTokens`
 * grammar widget filters use; optional (`…?`) tokens that stay unresolved are
 * dropped, and a REQUIRED token that stays unresolved marks the request
 * `blocked` (the page context it depends on isn't set yet — callers skip the
 * fetch instead of sending a literal `@workspace.…`).
 *
 * @param {{url: string, method?: string, params?: object}} config The endpointSource block.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] The token context.
 * @return {{url: string, method: ('GET'|'POST'), params: object, blocked: boolean}} The resolved request.
 */
export function resolveEndpointRequest(config, ctx) {
	const cfg = config || {}
	const url = interpolateUrlTokens(cfg.url || '', ctx)
	const resolved = resolveFilterTokens(cfg.params || {}, ctx)
	const params = dropOptionalUnresolved(resolved)
	const blocked = hasUnresolvedTokens(params)
	const method = String(cfg.method || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET'
	return { url, method, params, blocked }
}

/**
 * Stable cache key for a resolved endpoint request. One entry per
 * `(method, url, resolved params)` — the params carry the resolved period /
 * date window, so a period switch is a different key (per-period caching).
 *
 * @param {{url: string, method: string, params: object}} request The resolved request.
 * @return {string} The cache key.
 */
export function endpointCacheKey(request) {
	return `${request.method} ${request.url} ${JSON.stringify(request.params || {})}`
}

/**
 * Drop every cached endpoint response (and any in-flight dedup entry).
 * Tests and page-level refresh flows use this to force fresh data.
 *
 * @return {void}
 */
export function invalidateEndpointSourceCache() {
	responseCache.clear()
}

/**
 * Fetch the shared response body for a resolved request, deduping concurrent
 * identical requests and caching for {@link ENDPOINT_SOURCE_TTL_MS}. An
 * errored fetch drops its cache entry so the next call retries.
 *
 * @param {{url: string, method: string, params: object}} request The resolved request.
 * @param {{force?: boolean}} [opts] `force: true` bypasses (and replaces) the cache entry.
 * @return {Promise<*>} The raw response body (`res.data`).
 */
async function fetchSharedResponse(request, opts) {
	const key = endpointCacheKey(request)
	const now = Date.now()
	if (opts && opts.force) responseCache.delete(key)
	const entry = responseCache.get(key)
	if (entry && (now - entry.timestamp) < ENDPOINT_SOURCE_TTL_MS) {
		return entry.promise
	}
	const promise = (async () => {
		const [{ default: axios }, { generateUrl }] = await Promise.all([
			import('@nextcloud/axios'),
			import('@nextcloud/router'),
		])
		// Leave absolute URLs (http/https) untouched; route app-relative
		// paths through generateUrl so they resolve under the NC base.
		const url = /^https?:\/\//i.test(request.url) ? request.url : generateUrl(request.url)
		const res = request.method === 'POST'
			? await axios.post(url, request.params || {})
			: await axios.get(url, { params: request.params || {} })
		return res && res.data
	})().catch((err) => {
		responseCache.delete(key)
		throw err
	})
	responseCache.set(key, { promise, timestamp: now })
	return promise
}

/**
 * One-shot cached fetch of an `endpointSource`: resolve tokens, share the
 * request, pluck `responsePath`. Returns `null` when the config is unusable
 * (no url) or the request is blocked on an unresolved REQUIRED token, and
 * `null` when the plucked payload is `undefined`.
 *
 * Use this from an imperative fetch flow (Options-API widgets); use
 * {@link useEndpointSource} for the fully reactive form.
 *
 * @param {{url: string, method?: string, params?: object, responsePath?: string}} config The endpointSource block.
 * @param {{objectId?: (string|number), object?: object, workspace?: object, config?: object}} [ctx] The token context.
 * @param {{force?: boolean}} [opts] `force: true` bypasses the shared cache.
 * @return {Promise<*>} The plucked payload (or null).
 */
export async function fetchEndpointSource(config, ctx, opts) {
	if (!config || !config.url) return null
	const request = resolveEndpointRequest(config, ctx)
	if (request.blocked) return null
	const body = await fetchSharedResponse(request, opts)
	const payload = getByPath(body, config.responsePath)
	return payload === undefined ? null : payload
}

/**
 * Unwrap a value that may be a plain value, a ref, or a getter function.
 *
 * @param {*} v The wrapped value.
 * @return {*} The unwrapped value.
 */
function read(v) {
	return typeof v === 'function' ? v() : unref(v)
}

/**
 * Reactive endpoint data binding.
 *
 * Resolves the `endpointSource` block into reactive
 * `{ data, loading, error, refetch }`. The request signature (url + resolved
 * params + method) is watched, so a change in the page-level workspace
 * context (the dashboard date-range pills publishing `dateFrom` / `dateTo` /
 * `datePreset`, a page filter publishing `period`, …) re-resolves the tokens
 * and refetches automatically. When the config is `null` / has no `url` the
 * composable never queries and `data.value` stays `null`.
 *
 * Refresh wiring (library event-bus):
 *  - `cn:page:refresh` → force-refetch past the shared cache.
 *  - `cn:widget:refresh` with a payload `widgetId` matching the non-empty
 *    `widgetId` option → force-refetch.
 *  - a bump of the optional reactive `refreshKey` → force-refetch (escape
 *    hatch for app-local refresh signals the library cannot observe).
 *
 * @param {object|import('vue').Ref<object>|Function} source The endpointSource block (object, ref, or getter).
 * @param {object} [options] Options.
 * @param {object|import('vue').Ref<object>|Function} [options.ctx] Token context `{ objectId?, object?, workspace?, config? }` (object, ref, or getter).
 * @param {string|import('vue').Ref<string>|Function} [options.widgetId] Widget id matched against `cn:widget:refresh` payloads (empty disables widget-scoped refresh).
 * @param {*} [options.refreshKey] Reactive value (ref or getter) whose changes force a refetch.
 * @return {{data: import('vue').Ref<*>, loading: import('vue').Ref<boolean>, error: import('vue').Ref<string>, refetch: Function}} Reactive state + a `refetch(force = true)` trigger.
 */
export function useEndpointSource(source, options) {
	const opts = options || {}
	const data = ref(null)
	const loading = ref(false)
	const error = ref('')
	// Monotonic fetch id so a stale (slower) response never overwrites a
	// newer one after the request signature changed.
	let fetchSeq = 0

	const readCtx = () => read(opts.ctx) || {}

	/**
	 * Stable request signature: null when there is nothing to fetch,
	 * otherwise the resolved url/params/method + responsePath (+ blocked
	 * flag so un-blocking triggers the fetch).
	 */
	const requestKey = computed(() => {
		const cfg = read(source)
		if (!cfg || !cfg.url) return null
		const request = resolveEndpointRequest(cfg, readCtx())
		return JSON.stringify({
			u: request.url,
			m: request.method,
			p: request.params,
			r: cfg.responsePath || '',
			b: request.blocked,
		})
	})

	/**
	 * Run (or re-run) the fetch for the current config.
	 *
	 * @param {boolean} [force] Bypass the shared cache (refresh semantics).
	 * @return {Promise<void>}
	 */
	async function load(force) {
		const cfg = read(source)
		const seq = ++fetchSeq
		if (!cfg || !cfg.url) {
			data.value = null
			error.value = ''
			loading.value = false
			return
		}
		const request = resolveEndpointRequest(cfg, readCtx())
		if (request.blocked) {
			// A required context token is unset — wait, don't error.
			data.value = null
			error.value = ''
			loading.value = false
			return
		}
		const startedAt = Date.now()
		loading.value = true
		error.value = ''
		try {
			const body = await fetchSharedResponse(request, { force: force === true })
			if (seq !== fetchSeq) return
			const payload = getByPath(body, cfg.responsePath)
			data.value = payload === undefined ? null : payload
		} catch (e) {
			if (seq !== fetchSeq) return
			error.value = (e && e.message) || 'error'
			data.value = null
		} finally {
			if (seq === fetchSeq) {
				// Forced refetches hold `loading` to MIN_FORCED_LOADING_MS so
				// the refresh is perceivable even against a fast endpoint; a
				// newer run owns the flag once fetchSeq moves on.
				const hold = force === true ? MIN_FORCED_LOADING_MS - (Date.now() - startedAt) : 0
				if (hold > 0) {
					setTimeout(() => {
						if (seq === fetchSeq) loading.value = false
					}, hold)
				} else {
					loading.value = false
				}
			}
		}
	}

	/**
	 * Public refetch trigger. Force (cache-bypassing) by default — that is
	 * what every refresh affordance wants; pass `false` to allow a cache hit.
	 *
	 * @param {boolean} [force] Bypass the shared cache (default true).
	 * @return {Promise<void>}
	 */
	const refetch = (force = true) => load(force)

	watch(requestKey, () => { load(false) }, { immediate: true })

	if (opts.refreshKey !== undefined) {
		watch(() => read(opts.refreshKey), () => { load(true) })
	}

	const onPageRefresh = () => { load(true) }
	const onWidgetRefresh = (payload) => {
		const id = read(opts.widgetId)
		if (!id) return
		if (!payload || payload.widgetId !== id) return
		load(true)
	}
	subscribe(PAGE_REFRESH_CHANNEL, onPageRefresh)
	subscribe(WIDGET_REFRESH_CHANNEL, onWidgetRefresh)
	if (getCurrentScope()) {
		onScopeDispose(() => {
			unsubscribe(PAGE_REFRESH_CHANNEL, onPageRefresh)
			unsubscribe(WIDGET_REFRESH_CHANNEL, onWidgetRefresh)
		})
	}

	return { data, loading, error, refetch }
}
