/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnChartWidget's `dataSource.bucket` time-series path
 * (REST `/timeseries`): the injected dashboard date range is sent
 * VERBATIM, a range change re-fires the request, the staticRange /
 * 12-month fallbacks still apply, and axis labels are formatted at the
 * granularity of the bucket's own interval.
 *
 * Regression guard: an earlier revision widened any window shorter than
 * 90 days to a fixed 365-day lookback. Every built-in preset is shorter
 * than 90 days, so the user's `from` was always discarded and the chip
 * label disagreed with the plotted data.
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		for (const [k, v] of Object.entries(params || {})) out = out.replace(`{${k}}`, v)
		return `/nc${out}`
	}),
}))

/* eslint-disable import/first -- these imports sit BELOW the jest.mock() calls
   on purpose: the widget lazily `import()`s axios/router inside
   fetchTimeBucket, so the mocks must be registered first. */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
/* eslint-enable import/first */

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const TIMESERIES_URL = '/nc/apps/openregister/api/objects/aggregations/openconnector/call_log/timeseries'

// Mirrors Integriq's `calls-daily` manifest widget.
const dataSource = {
	register: 'openconnector',
	schema: 'call_log',
	bucket: { field: 'created', interval: 'day', fromVar: 'from', toVar: 'to' },
}

// The `last-7` window CnDashboardPage resolves by default.
const LAST_7 = {
	from: '2026-08-06T00:00:00.000Z',
	to: '2026-08-12T23:59:59.999Z',
	preset: 'last-7',
}

/**
 * Mount the widget with an optional injected dashboard date range.
 *
 * @param {object} props Component props.
 * @param {import('vue').Ref|null} range Injected `cnDashboardDateRange` ref, or null to omit the provide.
 * @return {object} The VTU wrapper.
 */
function mountChart(props = {}, range = null) {
	return shallowMount(CnChartWidget, {
		propsData: { dataSource, ...props },
		global: range ? { provide: { cnDashboardDateRange: range } } : {},
	})
}

describe('CnChartWidget — dataSource.bucket time series', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { groups: [] } })
	})

	it('sends the injected range verbatim — no widening of a sub-90-day window', async () => {
		mountChart({}, ref({ ...LAST_7 }))
		await flush()

		expect(axios.get).toHaveBeenCalledTimes(1)
		expect(axios.get).toHaveBeenCalledWith(TIMESERIES_URL, {
			params: {
				field: 'created',
				interval: 'DAY',
				metric: 'count',
				from: LAST_7.from,
				to: LAST_7.to,
			},
		})
	})

	it('re-fires with the new bounds when the injected range changes', async () => {
		const range = ref({ ...LAST_7 })
		const wrapper = mountChart({}, range)
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(1)

		range.value = {
			from: '2026-07-14T00:00:00.000Z',
			to: '2026-08-12T23:59:59.999Z',
			preset: 'last-30',
		}
		await wrapper.vm.$nextTick()
		await flush()

		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(axios.get.mock.calls[1][1].params).toMatchObject({
			from: '2026-07-14T00:00:00.000Z',
			to: '2026-08-12T23:59:59.999Z',
		})
	})

	it('falls back to bucket.staticRange when no range is injected', async () => {
		mountChart({
			dataSource: {
				...dataSource,
				bucket: {
					...dataSource.bucket,
					staticRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-03-31T23:59:59.999Z' },
				},
			},
		})
		await flush()

		expect(axios.get.mock.calls[0][1].params).toMatchObject({
			from: '2026-01-01T00:00:00.000Z',
			to: '2026-03-31T23:59:59.999Z',
		})
	})

	it('falls back to a 12-month lookback with neither an injected range nor a staticRange', async () => {
		mountChart()
		await flush()

		const { from, to } = axios.get.mock.calls[0][1].params
		const span = new Date(to).getTime() - new Date(from).getTime()
		expect(span).toBe(365 * 86400000)
		// `to` is "now", so it should be within a few seconds of the clock.
		expect(Math.abs(Date.now() - new Date(to).getTime())).toBeLessThan(10000)
	})

	// Vue 3 auto-unwraps a ref reached through the Options `inject:`
	// declaration, so the component sees the plain value. Reading `.value` off
	// it (as the Vue 2.7 code did) yields undefined, which silently pinned
	// every chart to its fallback window AND froze the bucketKey watcher, so
	// no request fired on a range change at all.
	it('reads an Options-inject range that Vue 3 already unwrapped', () => {
		const wrapper = mountChart({}, ref({ ...LAST_7 }))
		// What the component receives via `this.` is the unwrapped value...
		expect(wrapper.vm.cnDashboardDateRange).toMatchObject({ from: LAST_7.from })
		expect(wrapper.vm.cnDashboardDateRange.value).toBeUndefined()
		// ...and activeRange normalises it back to a usable window.
		expect(wrapper.vm.activeRange).toMatchObject({ from: LAST_7.from, to: LAST_7.to })
		expect(wrapper.vm.bucketKey).toContain(LAST_7.from)
	})

	// Switching the date chip re-enters fetchTimeBucket while the previous request
	// is still open, and a narrower window usually answers faster — so without a
	// generation guard the slower WIDER series lands last and sits under the new
	// chip's label. Newly reachable once the inject-unwrap fix above let a range
	// change refetch at all.
	it('ignores a slow response that a newer range has superseded', async () => {
		const range = ref({ ...LAST_7 })
		let resolveFirst
		axios.get
			.mockImplementationOnce(() => new Promise((resolve) => {
				resolveFirst = () => resolve({ data: { groups: [{ key: '2026-08-06', value: 111 }] } })
			}))
			.mockResolvedValueOnce({ data: { groups: [{ key: '2026-08-11', value: 222 }] } })

		const wrapper = mountChart({}, range)
		await flush()

		// Second window: fires, and answers first.
		range.value = { from: '2026-08-11T00:00:00.000Z', to: '2026-08-12T23:59:59.999Z', preset: 'last-2' }
		await flush()
		expect(axios.get).toHaveBeenCalledTimes(2)
		expect(wrapper.vm.bucketData.series[0].data).toEqual([222])

		// The first window's response now lands. It must be dropped.
		resolveFirst()
		await flush()
		expect(wrapper.vm.bucketData.series[0].data).toEqual([222])
	})

	it('passes the bucket interval through uppercased and flattens filters', async () => {
		mountChart({
			dataSource: {
				...dataSource,
				filter: { status: 'error', duration: { gte: 5 } },
				bucket: { ...dataSource.bucket, interval: 'hour' },
			},
		}, ref({ ...LAST_7 }))
		await flush()

		expect(axios.get.mock.calls[0][1].params).toMatchObject({
			interval: 'HOUR',
			'filter[status]': 'error',
			'filter[duration][gte]': 5,
		})
	})
})

describe('CnChartWidget — formatBucketKey granularity', () => {
	let vm

	beforeAll(() => {
		axios.get.mockResolvedValue({ data: { groups: [] } })
		vm = mountChart().vm
	})

	// The reported bug: with `interval: 'day'` every bucket in August 2026
	// rendered as the identical "Aug 26" (August *2026*, not the 26th), so a
	// seven-day series read as one column. Assertions compare labels to each
	// other rather than to literal strings — the exact wording is locale- and
	// timezone-dependent, the distinctness is what the axis depends on.
	it('gives distinct labels to distinct days at interval=day', () => {
		const a = vm.formatBucketKey('2026-08-06T12:00:00Z', 'day')
		const b = vm.formatBucketKey('2026-08-07T12:00:00Z', 'day')
		expect(a).not.toBe(b)
		// ...and neither collapses onto the month/year form.
		expect(a).not.toBe(vm.formatBucketKey('2026-08-06T12:00:00Z', 'month'))
	})

	it('gives distinct labels to distinct hours at interval=hour', () => {
		const a = vm.formatBucketKey('2026-08-06T09:00:00Z', 'hour')
		const b = vm.formatBucketKey('2026-08-06T14:00:00Z', 'hour')
		expect(a).not.toBe(b)
	})

	it('gives distinct labels to distinct minutes at interval=minute', () => {
		const a = vm.formatBucketKey('2026-08-06T09:15:00Z', 'minute')
		const b = vm.formatBucketKey('2026-08-06T09:45:00Z', 'minute')
		expect(a).not.toBe(b)
	})

	it('renders a bare year at interval=year', () => {
		expect(vm.formatBucketKey('2026-01-01T12:00:00Z', 'year')).toBe('2026')
	})

	it('keeps the month/year form for month buckets and when no interval is given', () => {
		const withInterval = vm.formatBucketKey('2026-08-06T12:00:00Z', 'month')
		expect(withInterval).toBe(vm.formatBucketKey('2026-08-06T12:00:00Z'))
		expect(withInterval).toMatch(/26/)
	})

	it('is case-insensitive about the interval', () => {
		expect(vm.formatBucketKey('2026-08-06T12:00:00Z', 'DAY'))
			.toBe(vm.formatBucketKey('2026-08-06T12:00:00Z', 'day'))
	})

	it('passes through empty and unparseable keys unchanged', () => {
		expect(vm.formatBucketKey('', 'day')).toBe('')
		expect(vm.formatBucketKey('not-a-date', 'day')).toBe('not-a-date')
	})

	it('reads the key it was given, whatever the key\'s own format', () => {
		// The three shapes an aggregation can return for the same day must land on
		// the same label: `new Date()` assumes UTC for the date-only form and LOCAL
		// time for the space-separated one, so anything that leans on the
		// constructor's default zone renders one axis in two zones.
		const dateOnly = vm.formatBucketKey('2026-08-10', 'day')
		expect(vm.formatBucketKey('2026-08-10T00:00:00Z', 'day')).toBe(dateOnly)
		expect(vm.formatBucketKey('2026-08-10 00:00:00', 'day')).toBe(dateOnly)
	})

	it('keeps a quarter-style key it cannot model as-is', () => {
		// The date regex must not match a PREFIX and quietly report "Jan 2026" for
		// every quarter of the year.
		expect(vm.formatBucketKey('2026-Q1', 'quarter')).toBe('2026-Q1')
	})
})

// Bucket keys are period LABELS minted by the backend, not instants to re-zone.
// Routing them through the Date constructor's assumed zone shifted every
// date-only bucket back a day west of UTC — a US user read the 10 Aug bucket as
// "9 Aug" — and pushed a `2026-01-01T00:00:00Z` year bucket into the previous
// year, while the dashboard date chip (which reads the date part only) kept
// showing the right day.
//
// The runner's own zone cannot be changed from inside a spec (Jest's process.env
// copy does not reach Node's timezone cache), so the first group below pins the
// contract with keys carrying an explicit non-UTC OFFSET, which shifts the day in
// EVERY zone including CI's UTC. The second group states the same contract for
// the shapes the bug was reported against; those are necessarily quiet in a UTC
// runner and fail in a west-of-UTC one, which is the environment that had the bug.
describe('CnChartWidget — formatBucketKey reads the key, not a re-zoned instant', () => {
	let vm

	beforeAll(() => {
		axios.get.mockResolvedValue({ data: { groups: [] } })
		vm = mountChart().vm
	})

	it('labels an offset-bearing day bucket with the day the key names', () => {
		// Re-zoned to UTC this instant is 9 Aug 20:00 — the previous day.
		const own = vm.formatBucketKey('2026-08-10T01:00:00+05:00', 'day')
		expect(own).toBe(vm.formatBucketKey('2026-08-10', 'day'))
	})

	it('labels an offset-bearing year bucket with the year the key names', () => {
		// Re-zoned to UTC this is 31 Dec 2025.
		expect(vm.formatBucketKey('2026-01-01T05:00:00+07:00', 'year')).toBe('2026')
	})

	it('labels an offset-bearing month bucket with the month the key names', () => {
		const label = vm.formatBucketKey('2026-01-01T05:00:00+07:00', 'month')
		expect(label).toBe(vm.formatBucketKey('2026-01-15', 'month'))
	})

	describe('the reported shapes (quiet under a UTC runner, failing west of it)', () => {
		it('labels a date-only day bucket with its own day', () => {
			const expected = new Date(2026, 7, 10).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
			expect(vm.formatBucketKey('2026-08-10', 'day')).toBe(expected)
		})

		it('labels a UTC-midnight year bucket with its own year', () => {
			expect(vm.formatBucketKey('2026-01-01T00:00:00Z', 'year')).toBe('2026')
		})

		it('labels a UTC-midnight month bucket with its own month', () => {
			const expected = new Date(2026, 0, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
			expect(vm.formatBucketKey('2026-01-01T00:00:00Z', 'month')).toBe(expected)
		})

		it('keeps the time of day a timestamped bucket carries', () => {
			const expected = new Date(2026, 7, 10, 14).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' })
			expect(vm.formatBucketKey('2026-08-10 14:00:00', 'hour')).toBe(expected)
		})
	})
})
