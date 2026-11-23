/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A self-fetching widget tells its host what it shows (`data`), so a
 * dashboard can derive values from it (launchpad widget-calculated-fields).
 *
 * @spec openspec/changes/widget-data-event/specs/widget-data-event/spec.md#requirement-a-self-fetching-widget-tells-its-host-what-it-shows
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))
jest.mock('../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({ data: { count: 42 }, loading: false, error: null }),
}))

import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'
import CnStatsBlockWidget from '../../src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue'
import { seriesTotal } from '../../src/mixins/widgetData.js'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('seriesTotal', () => {
	it('sums a flat series, the first named series, and points', () => {
		expect(seriesTotal([4, 9])).toBe(13)
		expect(seriesTotal([{ name: 'a', data: [1, 2, 'x'] }, { name: 'b', data: [100] }])).toBe(3)
		expect(seriesTotal([{ name: 'a', data: [{ x: 'm', y: 5 }, { x: 'n', y: 6 }] }])).toBe(11)
	})

	it('is null for no series', () => {
		expect(seriesTotal(undefined)).toBeNull()
		expect(seriesTotal([])).toBeNull()
		expect(seriesTotal([{ name: 'a' }])).toBeNull()
	})
})

describe('CnChartWidget data event', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('emits the fetched groups once they arrive, with their total', async () => {
		axios.get.mockResolvedValue({ data: { groups: [{ key: 'new', value: 4 }, { key: 'open', value: 9 }] } })
		const w = shallowMount(CnChartWidget, { props: { type: 'donut', dataSource: { register: 'crm', schema: 'request', aggregate: { groupBy: 'status' } } } })
		await flush()
		await w.vm.$nextTick()
		const last = w.emitted('data').at(-1)[0]
		expect(last.total).toBe(13)
		expect([...last.series].sort()).toEqual([4, 9])
		expect(last.categories).toHaveLength(2)
	})

	it('emits static series as well', () => {
		const w = mount(CnChartWidget, { props: { type: 'bar-list', categories: ['A', 'B'], series: [{ name: 'Cases', data: [2, 3] }] }, global: { provide: { cnWorkspaceContext: {} } } })
		expect(w.emitted('data')[0][0]).toMatchObject({ categories: ['A', 'B'], total: 5 })
	})

	it('emits nothing while there is no series', () => {
		const w = shallowMount(CnChartWidget, { props: { type: 'bar' } })
		expect(w.emitted('data')).toBeUndefined()
	})
})

describe('CnStatsBlockWidget data event', () => {
	it('emits the count of its source', async () => {
		const w = mount(CnStatsBlockWidget, { props: { title: 'Open', dataSource: { register: 'oc', schema: 'sources', aggregate: 'count', graphql: { query: '{ x }' } } }, global: { stubs: { CnStatsBlock: true, CnStatWidget: true } } })
		await flush()
		expect(w.emitted('data')[0][0]).toEqual({ count: 42 })
	})
})
