/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnChartWidget's categorical `dataSource.groupBy` with `labels` (words for
 * an enum's raw values, through the app's catalogue) and `otherBucket` (what
 * falls past `limit` as one "Other" slice). pl2 PqOperationeel drew raw
 * statuses and 18 category slices where the board draws named rows and the
 * top three plus "Overig".
 *
 * @spec openspec/changes/chart-groupby-labels-other/specs/chart-groupby-labels-other/spec.md
 */

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper; the
// local Vue-2 `render: (h) => h('div')` mock that lived here throws under Vue 3.
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: jest.fn((p, params) => {
		let out = p
		for (const [k, v] of Object.entries(params || {})) {
			out = out.replace(`{${k}}`, v)
		}
		return `/nc${out}`
	}),
}))
// `resolveAggregateRefs` prefers the SHARED pinia object store and only falls
// back to the direct axios GET these labelResolve specs mock when NO store is
// active. Under Vue 2, pinia was installed as a plugin but no pinia was made
// `setActivePinia`, so a bare `useObjectStore()` threw and the axios branch
// ran. The Vue-3 `tests/setup.js` must call `setActivePinia()` per test
// (pinia 2 resolves stores from the active instance, not a global Vue mixin),
// which silently moved this file onto the store branch — labels stayed as raw
// uuids because the store's own fetch has nothing mocked behind it. Force the
// documented "no Pinia store is active" branch so the axios path named in the
// test titles is the one under test.
jest.mock('../../src/store/useObjectStore.js', () => ({
	__esModule: true,
	useObjectStore: () => {
		throw new Error('no active pinia')
	},
}))

/* These imports sit BELOW the jest.mock() above
   on purpose: the mock documents the "no active pinia" branch these specs
   exercise, and keeping the two adjacent is what makes that readable. */
import axios from '@nextcloud/axios'
import { shallowMount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// shallowMount stubs the apexcharts child `<component :is>` so the real

/**
 * Mount the chart with a Dutch catalogue for two words.
 *
 * @param {object} props The chart's props.
 * @return {object} The wrapper.
 */
function mountChart(props) {
	return shallowMount(CnChartWidget, {
		propsData: props,
		global: { provide: { cnTranslate: (text) => ({ 'In progress': 'In behandeling', New: 'Nieuw' }[text] || text) } },
	})
}

describe('CnChartWidget — dataSource.groupBy labels and otherBucket', () => {
	beforeEach(() => {
		axios.get.mockReset()
		axios.get.mockResolvedValue({
			data: {
				groups: [
					{ key: 'in_progress', value: 9 },
					{ key: 'new', value: 4 },
					{ key: 'odd', value: 2 },
					{ key: 'rest', value: 1 },
				],
			},
		})
	})

	it('names raw values through the labels map and the app catalogue, keeping a key without one', async () => {
		const wrapper = mountChart({
			type: 'bar-list',
			dataSource: { register: 'crm', schema: 'request', groupBy: { field: 'status', sort: 'desc', labels: { in_progress: 'In progress', new: 'New' } } },
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.groupByData.categories).toEqual(['In behandeling', 'Nieuw', 'odd', 'rest'])
	})

	it('folds what falls past the limit into one Other slice', async () => {
		const wrapper = mountChart({
			type: 'donut',
			dataSource: { register: 'crm', schema: 'request', groupBy: { field: 'status', sort: 'desc', limit: 2, otherBucket: true } },
		})
		await flush()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.groupByData.labels).toEqual(['in_progress', 'new', 'Other'])
		expect(wrapper.vm.groupByData.series).toEqual([9, 4, 3])
	})
})
