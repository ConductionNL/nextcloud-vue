/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * screens-ratio-stat: a stat tile that is a share of two counts ("92% within
 * the deadline"), a count the aggregation endpoint cannot express, and the
 * average time between two dates ("1,2 days average answer time").
 *
 * @spec openspec/changes/screens-ratio-stat/specs/ratio-stat/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p, v) => `/nc${p.replace(/\{(\w+)\}/g, (_, k) => v[k])}`) }))
jest.mock('@/utils/fetchFilterCounts.js', () => ({
	...jest.requireActual('@/utils/fetchFilterCounts.js'),
	fetchListTotal: jest.fn(),
}))

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnStatWidget from '@/components/CnStatWidget/CnStatWidget.vue'
import { fetchListTotal } from '@/utils/fetchFilterCounts.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * @param {object} content stat content
 * @return {object} wrapper
 */
function mountStat(content) {
	return mount(CnStatWidget, {
		propsData: { content },
		stubs: { NcLoadingIcon: { template: '<span />' } },
		provide: { cnWorkspaceContext: {} },
	})
}

beforeEach(() => {
	axios.get.mockReset()
	fetchListTotal.mockReset()
})

describe('ratio source', () => {
	const ratio = (extra = {}) => ({
		label: 'Within the deadline',
		format: { style: 'percent', decimals: 0 },
		source: {
			kind: 'ratio',
			register: 'r',
			schema: 'ticket',
			metric: 'count',
			numerator: { filter: { assignee: 'me', withinSla: true } },
			denominator: { filter: { assignee: 'me', status: 'resolved' } },
			...extra,
		},
	})

	it('is the numerator count over the denominator count, as a percentage', async () => {
		axios.get.mockImplementation(async (url, { params }) => ({ data: { value: params['filter[withinSla]'] ? 46 : 50 } }))
		const w = mountStat(ratio())
		await flush()
		expect(w.vm.value).toBeCloseTo(92)
		expect(w.vm.formattedValue).toBe('92%')
	})

	it('has no value, not a division error, while the denominator is zero', async () => {
		axios.get.mockResolvedValue({ data: { value: 0 } })
		const w = mountStat(ratio())
		await flush()
		expect(w.vm.value).toBeNull()
	})

	it('each part can name its own metric, field and via', async () => {
		axios.get.mockResolvedValue({ data: { value: 10 } })
		fetchListTotal.mockResolvedValue(4)
		const w = mountStat(ratio({
			numerator: { via: 'list', filter: { answeredAt: 'x' } },
			denominator: { metric: 'sum', field: 'weight', filter: {} },
		}))
		await flush()
		expect(fetchListTotal).toHaveBeenCalledTimes(1)
		expect(axios.get.mock.calls[0][1].params).toMatchObject({ metric: 'sum', field: 'weight' })
		expect(w.vm.value).toBeCloseTo(40)
	})
})

describe('a count the aggregation endpoint cannot express', () => {
	it('reads the list total for a filter holding a list of values', async () => {
		fetchListTotal.mockResolvedValue(7)
		const w = mountStat({ source: { register: 'r', schema: 'ticket', metric: 'count', filter: { assignee: '@me', status: { notIn: ['resolved', 'closed'] } } } })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(fetchListTotal.mock.calls[0][0]).toBe('r')
		expect(fetchListTotal.mock.calls[0][1]).toBe('ticket')
		expect(fetchListTotal.mock.calls[0][2].status).toEqual({ notIn: ['resolved', 'closed'] })
		expect(w.vm.value).toBe(7)
	})

	it('keeps the aggregation endpoint for a plain filter and for a non-count metric', async () => {
		axios.get.mockResolvedValue({ data: { value: 3 } })
		const plain = mountStat({ source: { register: 'r', schema: 'ticket', metric: 'count', filter: { status: 'open' } } })
		await flush()
		expect(fetchListTotal).not.toHaveBeenCalled()
		expect(plain.vm.value).toBe(3)
		const sum = mountStat({ source: { register: 'r', schema: 'ticket', metric: 'sum', field: 'v', filter: { status: { in: ['a'] } } } })
		await flush()
		expect(fetchListTotal).not.toHaveBeenCalled()
		expect(sum.vm.value).toBe(3)
	})

	it('reads the list total for a filter that tests a field for no value, without via', async () => {
		fetchListTotal.mockResolvedValue(48)
		const w = mountStat({ source: { register: 'r', schema: 'ticket', metric: 'count', filter: { assignee: { isnull: true } } } })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(fetchListTotal.mock.calls[0][2]).toEqual({ assignee: { isnull: true } })
		expect(w.vm.value).toBe(48)
	})

	it('via: "list" counts through the list total (the endpoint has no null operator)', async () => {
		fetchListTotal.mockResolvedValue(2)
		const w = mountStat({ source: { register: 'r', schema: 'ticket', metric: 'count', via: 'list', filter: { resolvedAt: '' } } })
		await flush()
		expect(axios.get).not.toHaveBeenCalled()
		expect(w.vm.value).toBe(2)
	})
})

describe('elapsed source', () => {
	const rows = [
		{ occurredAt: '2026-10-01T08:00:00Z', resolvedAt: '2026-10-02T08:00:00Z' },
		{ occurredAt: '2026-10-01T08:00:00Z', resolvedAt: '2026-10-01T20:00:00Z' },
		{ occurredAt: '2026-10-05T08:00:00Z', resolvedAt: null },
		{ occurredAt: '2026-10-05T08:00:00Z', resolvedAt: '2026-10-04T08:00:00Z' },
	]
	const elapsed = (extra = {}) => ({
		format: { style: 'decimal', decimals: 1, suffix: ' days' },
		source: { kind: 'elapsed', register: 'r', schema: 'ticket', from: 'occurredAt', to: 'resolvedAt', filter: { assignee: '@me', status: { in: ['resolved'] } }, ...extra },
	})

	it('averages the time between two dates, leaving out rows missing a date or running backwards', async () => {
		axios.get.mockResolvedValue({ data: { results: rows } })
		const w = mountStat(elapsed())
		await flush()
		// (24h + 12h) / 2 = 18h = 0.75 days.
		expect(w.vm.value).toBeCloseTo(0.75)
		const params = axios.get.mock.calls[0][1].params
		expect(params._limit).toBe(1000)
		expect(params['status[in]']).toEqual(['resolved'])
	})

	it('answers in hours or minutes', async () => {
		axios.get.mockResolvedValue({ data: { results: rows } })
		const w = mountStat(elapsed({ unit: 'hours' }))
		await flush()
		expect(w.vm.value).toBeCloseTo(18)
	})

	it('has no value when nothing qualifies, or a date field is not named', async () => {
		axios.get.mockResolvedValue({ data: { results: [rows[2]] } })
		const none = mountStat(elapsed())
		await flush()
		expect(none.vm.value).toBeNull()
		const unnamed = mountStat(elapsed({ to: undefined }))
		await flush()
		expect(unnamed.vm.value).toBeNull()
	})
})
