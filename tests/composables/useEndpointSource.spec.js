/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for useEndpointSource — the shared endpoint data binding (Wave 2,
 * nextcloud-vue#91): token resolution on params/URL, per-(url+params)
 * request dedup + TTL cache, responsePath plucking, blocked required
 * tokens, the cn:page:refresh / cn:widget:refresh bus subscriptions, and
 * the reactive refreshKey escape hatch.
 */

// `mock`-prefixed names are the only out-of-scope vars jest.mock factories
// may reference. Declared with var so hoisting keeps them defined.
var mockBusHandlers = {}

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p) => `/nc${p}`),
}))
// Capture event-bus subscriptions so tests can fire them manually. Guarded:
// transitively imported modules may subscribe at MODULE LOAD, before the
// hoisted `var` above is assigned — those early subscriptions are dropped.
jest.mock('@nextcloud/event-bus', () => ({
	subscribe: jest.fn((channel, cb) => {
		if (!mockBusHandlers) return
		if (!mockBusHandlers[channel]) mockBusHandlers[channel] = []
		mockBusHandlers[channel].push(cb)
	}),
	unsubscribe: jest.fn(),
	emit: jest.fn(),
}))

import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { ref } from 'vue'

import {
	useEndpointSource,
	fetchEndpointSource,
	resolveEndpointRequest,
	interpolateUrlTokens,
	endpointCacheKey,
	invalidateEndpointSourceCache,
	getByPath,
	MIN_FORCED_LOADING_MS,
} from '../../src/composables/useEndpointSource.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/** Fire every captured handler on a bus channel. */
const fireBus = (channel, payload) => {
	for (const cb of (mockBusHandlers[channel] || [])) cb(payload)
}

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	generateUrl.mockClear()
	invalidateEndpointSourceCache()
	for (const k of Object.keys(mockBusHandlers)) delete mockBusHandlers[k]
})

describe('getByPath', () => {
	it('plucks nested dot-paths and returns the object for an empty path', () => {
		const obj = { a: { b: [{ c: 7 }] } }
		expect(getByPath(obj, 'a.b.0.c')).toBe(7)
		expect(getByPath(obj, '')).toBe(obj)
		expect(getByPath(obj, undefined)).toBe(obj)
		expect(getByPath(obj, 'a.x.c')).toBeUndefined()
	})
})

describe('interpolateUrlTokens', () => {
	it('resolves @page/@workspace/@config/@objectId/@object tokens', () => {
		const ctx = {
			objectId: 42,
			object: { slug: 'acme' },
			workspace: { period: 'month' },
			config: { tenant: 't1' },
		}
		expect(interpolateUrlTokens('/api/@page.period/x', ctx)).toBe('/api/month/x')
		expect(interpolateUrlTokens('/api/@workspace.period', ctx)).toBe('/api/month')
		expect(interpolateUrlTokens('/api/@config.tenant/@objectId/@object.slug', ctx))
			.toBe('/api/t1/42/acme')
	})

	it('collapses unresolved tokens to an empty string', () => {
		expect(interpolateUrlTokens('/api/@page.period', {})).toBe('/api/')
	})
})

describe('resolveEndpointRequest', () => {
	it('resolves params through the shared filter-token grammar', () => {
		const req = resolveEndpointRequest(
			{ url: '/api/x', params: { assignee: '@me', period: '@workspace.period', fixed: 1 } },
			{ workspace: { period: 'q1' } },
		)
		expect(req.params.period).toBe('q1')
		expect(req.params.fixed).toBe(1)
		expect(req.blocked).toBe(false)
	})

	it('drops unresolved OPTIONAL (?) tokens and blocks on unresolved REQUIRED tokens', () => {
		const optional = resolveEndpointRequest(
			{ url: '/api/x', params: { period: '@workspace.period?' } },
			{ workspace: {} },
		)
		expect(optional.params).toEqual({})
		expect(optional.blocked).toBe(false)

		const required = resolveEndpointRequest(
			{ url: '/api/x', params: { client: '@workspace.selectedClient' } },
			{ workspace: {} },
		)
		expect(required.blocked).toBe(true)
	})

	it('blocks a request whose URL token collapsed into an empty PATH segment', () => {
		// Measured on dossiq: a KPI tile bound to the loaded record built
		// `/cases/{id}/milestones/progress/@object.caseType` on first render,
		// before the record arrived. The token collapsed to '' and the request
		// 404'd, then re-fired correctly once the record loaded. The tile showed
		// the same value throughout, because a failed fetch and a real zero
		// render identically — so nothing looked wrong.
		const blocked = resolveEndpointRequest(
			{ url: '/apps/dossiq/api/cases/case-1/milestones/progress/@object.caseType' },
			{ objectId: 'case-1', object: null },
		)
		expect(blocked.blocked).toBe(true)

		const resolved = resolveEndpointRequest(
			{ url: '/apps/dossiq/api/cases/case-1/milestones/progress/@object.caseType' },
			{ objectId: 'case-1', object: { caseType: 'type-9' } },
		)
		expect(resolved.blocked).toBe(false)
		expect(resolved.url).toBe('/apps/dossiq/api/cases/case-1/milestones/progress/type-9')
	})

	it('blocks a mid-path collapse, not just a trailing one', () => {
		const req = resolveEndpointRequest(
			{ url: '/api/@object.tenant/cases' },
			{ object: {} },
		)
		expect(req.blocked).toBe(true)
	})

	it('leaves an empty QUERY value alone — only a path segment is a broken URL', () => {
		const req = resolveEndpointRequest(
			{ url: '/api/x?period=@workspace.period' },
			{ workspace: {} },
		)
		expect(req.blocked).toBe(false)
	})

	it('never blocks a URL that carries no tokens, however it is shaped', () => {
		// A caller may legitimately end a URL in a slash. Only a token that
		// COLLAPSED is evidence of a half-built path.
		expect(resolveEndpointRequest({ url: '/api/x/' }).blocked).toBe(false)
		expect(resolveEndpointRequest({ url: '//api/x' }).blocked).toBe(false)
	})

	it('normalizes the method (GET default, POST opt-in)', () => {
		expect(resolveEndpointRequest({ url: '/x' }).method).toBe('GET')
		expect(resolveEndpointRequest({ url: '/x', method: 'post' }).method).toBe('POST')
	})

	it('keys the cache per (method, url, resolved params)', () => {
		const a = endpointCacheKey(resolveEndpointRequest({ url: '/x', params: { p: 'a' } }))
		const b = endpointCacheKey(resolveEndpointRequest({ url: '/x', params: { p: 'b' } }))
		expect(a).not.toBe(b)
	})
})

describe('fetchEndpointSource — caching + dedup', () => {
	it('plucks the payload at responsePath and routes app-relative URLs through generateUrl', async () => {
		axios.get.mockResolvedValue({ data: { summary: { totalLeads: 12 } } })
		const value = await fetchEndpointSource({ url: '/api/overview', responsePath: 'summary.totalLeads' })
		expect(generateUrl).toHaveBeenCalledWith('/api/overview')
		expect(axios.get).toHaveBeenCalledWith('/nc/api/overview', { params: {} })
		expect(value).toBe(12)
	})

	it('dedupes identical (url+params) requests to ONE http call (the pipelinq overview semantics)', async () => {
		axios.get.mockResolvedValue({ data: { revenue: 100, previousPeriod: { revenue: 80 } } })
		const cfg = { url: '/api/commercial', params: { period: 'month' } }
		const [a, b] = await Promise.all([
			fetchEndpointSource({ ...cfg, responsePath: 'revenue' }),
			fetchEndpointSource({ ...cfg, responsePath: 'previousPeriod.revenue' }),
		])
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(a).toBe(100)
		expect(b).toBe(80)
	})

	it('caches per resolved params — a period switch is a fresh request', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		await fetchEndpointSource({ url: '/api/x', params: { period: 'week' } })
		await fetchEndpointSource({ url: '/api/x', params: { period: 'month' } })
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('serves a warm cache entry without a new request, and force bypasses it', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		await fetchEndpointSource({ url: '/api/x' })
		await fetchEndpointSource({ url: '/api/x' })
		expect(axios.get).toHaveBeenCalledTimes(1)
		await fetchEndpointSource({ url: '/api/x' }, undefined, { force: true })
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('drops the cache entry on error so the next call retries', async () => {
		axios.get.mockRejectedValueOnce(new Error('boom'))
		await expect(fetchEndpointSource({ url: '/api/x' })).rejects.toThrow('boom')
		axios.get.mockResolvedValue({ data: { ok: true } })
		const value = await fetchEndpointSource({ url: '/api/x' })
		expect(value).toEqual({ ok: true })
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('POST sends the resolved params as the JSON body', async () => {
		axios.post.mockResolvedValue({ data: { n: 3 } })
		const value = await fetchEndpointSource(
			{ url: '/api/x', method: 'POST', params: { assignee: '@me' }, responsePath: 'n' },
			{},
		)
		expect(axios.post).toHaveBeenCalledTimes(1)
		expect(axios.post.mock.calls[0][0]).toBe('/nc/api/x')
		expect(value).toBe(3)
	})

	it('leaves absolute URLs untouched and returns null when blocked', async () => {
		axios.get.mockResolvedValue({ data: { n: 9 } })
		await fetchEndpointSource({ url: 'https://example.com/api' })
		expect(generateUrl).not.toHaveBeenCalled()
		expect(axios.get).toHaveBeenCalledWith('https://example.com/api', { params: {} })

		const blocked = await fetchEndpointSource(
			{ url: '/api/x', params: { client: '@workspace.selectedClient' } },
			{ workspace: {} },
		)
		expect(blocked).toBeNull()
	})
})

describe('useEndpointSource — reactive binding', () => {
	it('fetches immediately and exposes the plucked payload', async () => {
		axios.get.mockResolvedValue({ data: { summary: { count: 5 } } })
		const { data, loading, error } = useEndpointSource({ url: '/api/x', responsePath: 'summary' })
		await flush()
		expect(data.value).toEqual({ count: 5 })
		expect(loading.value).toBe(false)
		expect(error.value).toBe('')
	})

	it('is a no-op for a null config', async () => {
		const { data } = useEndpointSource(null)
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(data.value).toBeNull()
	})

	it('re-resolves params and refetches when the reactive ctx changes (dateRange semantics)', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		const workspace = ref({ datePreset: 'month' })
		useEndpointSource(
			{ url: '/api/x', params: { period: '@workspace.datePreset?' } },
			{ ctx: () => ({ workspace: workspace.value }) },
		)
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][1]).toEqual({ params: { period: 'month' } })

		workspace.value = { datePreset: 'week' }
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.get.mock.calls[1][1]).toEqual({ params: { period: 'week' } })
	})

	it('waits (no fetch, no error) while a REQUIRED token is unresolved, then fetches when it resolves', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		const workspace = ref({})
		const { data, error } = useEndpointSource(
			{ url: '/api/x', params: { client: '@workspace.selectedClient' } },
			{ ctx: () => ({ workspace: workspace.value }) },
		)
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(data.value).toBeNull()
		expect(error.value).toBe('')

		workspace.value = { selectedClient: 'c-1' }
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][1]).toEqual({ params: { client: 'c-1' } })
	})

	it('surfaces fetch errors as a message and clears data', async () => {
		axios.get.mockRejectedValue(new Error('nope'))
		const { data, error } = useEndpointSource({ url: '/api/x' })
		await flush()
		expect(error.value).toBe('nope')
		expect(data.value).toBeNull()
	})

	it('force-refetches past the cache on cn:page:refresh', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		useEndpointSource({ url: '/api/x' })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		fireBus('cn:page:refresh', {})
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('force-refetches on cn:widget:refresh ONLY for a matching non-empty widgetId', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		useEndpointSource({ url: '/api/x' }, { widgetId: 'kpi-1' })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)

		fireBus('cn:widget:refresh', { widgetId: 'other' })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)

		fireBus('cn:widget:refresh', { widgetId: 'kpi-1' })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('ignores cn:widget:refresh when no widgetId option is set', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		useEndpointSource({ url: '/api/x' })
		await flush()
		fireBus('cn:widget:refresh', { widgetId: '' })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
	})

	it('force-refetches when the reactive refreshKey bumps (app-local signal escape hatch)', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		const token = ref(0)
		useEndpointSource({ url: '/api/x' }, { refreshKey: token })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		token.value++
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
	})

	it('exposes refetch(): force by default, cache-friendly with refetch(false)', async () => {
		axios.get.mockResolvedValue({ data: { v: 1 } })
		const { refetch } = useEndpointSource({ url: '/api/x' })
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)
		await refetch(false)
		expect(axios.get).toHaveBeenCalledTimes(1) // warm cache hit
		await refetch()
		expect(axios.get).toHaveBeenCalledTimes(2) // force
	})
})

// A refresh against a fast endpoint settles in milliseconds — without a
// minimum visible duration the loading state flashes imperceptibly and the
// Refresh click reads as having done nothing.
describe('useEndpointSource — minimum visible loading on forced refetch', () => {
	afterEach(() => {
		jest.useRealTimers()
	})

	it('holds loading for MIN_FORCED_LOADING_MS on a forced refetch while the data lands immediately', async () => {
		jest.useFakeTimers()
		axios.get.mockResolvedValue({ data: { v: 1 } })
		const { data, loading, refetch } = useEndpointSource({ url: '/api/x' })
		await jest.advanceTimersByTimeAsync(0)
		expect(loading.value).toBe(false)

		axios.get.mockResolvedValue({ data: { v: 2 } })
		const done = refetch()
		await jest.advanceTimersByTimeAsync(0)
		await done
		// The instant response already landed, but the flag is held so the
		// refresh stays perceivable.
		expect(data.value).toEqual({ v: 2 })
		expect(loading.value).toBe(true)

		await jest.advanceTimersByTimeAsync(MIN_FORCED_LOADING_MS)
		expect(loading.value).toBe(false)
	})

	it('does not hold loading on the initial (non-forced) load', async () => {
		jest.useFakeTimers()
		axios.get.mockResolvedValue({ data: { v: 1 } })
		const { loading } = useEndpointSource({ url: '/api/x' })
		await jest.advanceTimersByTimeAsync(0)
		expect(loading.value).toBe(false)
	})
})
