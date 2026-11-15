/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A selectable chart says which category the reader picked (`select`), with
 * the grouped field and the raw key, so a dashboard can filter its other
 * widgets on it (launchpad drill-down-cross-widget-filter).
 *
 * @spec openspec/changes/chart-widget-select-event/specs/chart-widget-select-event/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/nc${p}`) }))

import axios from '@nextcloud/axios'
import { mount, shallowMount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('CnChartWidget select', () => {
	beforeEach(() => {
		axios.get.mockReset()
	})

	it('emits the grouped field, the raw key and the label of a picked slice', async () => {
		axios.get.mockResolvedValue({ data: { groups: [{ key: 'new', value: 4 }, { key: 'in_progress', value: 9 }] } })
		const w = shallowMount(CnChartWidget, { props: { type: 'donut', selectable: true, dataSource: { register: 'crm', schema: 'request', aggregate: { groupBy: 'status' } } } })
		await flush()
		await w.vm.$nextTick()
		w.vm.onDataPointSelection(null, null, { dataPointIndex: 1 })
		expect(w.emitted('select')[0][0]).toEqual({ field: 'status', value: 'new', label: expect.any(String), index: 1 })
	})

	it('makes bar-list rows pickable and emits on a row click', async () => {
		const w = mount(CnChartWidget, { props: { type: 'bar-list', selectable: true, categories: ['Received', 'Decision'], series: [{ name: 'Cases', data: [14, 8] }] }, global: { provide: { cnWorkspaceContext: {} } } })
		await flush()
		const rows = w.findAll('[data-testid="cn-chart-widget-bar-row"]')
		expect(rows[1].element.tagName).toBe('BUTTON')
		await rows[1].trigger('click')
		expect(w.emitted('select')[0][0]).toEqual({ field: '', value: 'Decision', label: 'Decision', index: 1 })
	})

	it('emits nothing without selectable, and nothing for the folded Other bucket', async () => {
		const plain = mount(CnChartWidget, { props: { type: 'bar-list', categories: ['Received'], series: [{ name: 'Cases', data: [14] }] }, global: { provide: { cnWorkspaceContext: {} } } })
		plain.vm.onDataPointSelection(null, null, { dataPointIndex: 0 })
		expect(plain.emitted('select')).toBeUndefined()
		axios.get.mockResolvedValue({ data: { groups: [{ key: 'a', value: 5 }, { key: 'b', value: 4 }, { key: 'c', value: 1 }] } })
		const folded = shallowMount(CnChartWidget, { props: { type: 'pie', selectable: true, dataSource: { register: 'r', schema: 's', aggregate: { groupBy: 'kind', topN: 2, otherBucket: true } } } })
		await flush()
		await folded.vm.$nextTick()
		folded.vm.onDataPointSelection(null, null, { dataPointIndex: 2 })
		expect(folded.emitted('select')).toBeUndefined()
	})

	it('still navigates a drilldown and emits select beside it', async () => {
		axios.get.mockResolvedValue({ data: { groups: [{ key: 'open', value: 3 }] } })
		const push = jest.fn(() => Promise.resolve())
		const w = shallowMount(CnChartWidget, {
			props: { type: 'pie', selectable: true, dataSource: { register: 'r', schema: 's', aggregate: { groupBy: 'state' }, drilldown: { route: 'Cases', filterParam: 'state' } } },
			global: { mocks: { $router: { push } } },
		})
		await flush()
		await w.vm.$nextTick()
		w.vm.onDataPointSelection(null, null, { dataPointIndex: 0 })
		expect(push).toHaveBeenCalledWith({ name: 'Cases', query: { state: 'open' } })
		expect(w.emitted('select')[0][0]).toMatchObject({ field: 'state', value: 'open' })
	})
})
