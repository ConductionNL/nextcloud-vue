/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests that the KPI tile honours the page-level Refresh action.
 *
 * It used to subscribe to nothing at all, which made it the worst case of the
 * "Refresh does nothing" defect: this is the one dashboard widget rendered
 * WITHOUT CnWidgetWrapper (CnStatsBlock brings its own card chrome), so it has
 * no per-widget Refresh item either. The page action was its only refresh
 * affordance and it reached neither the REST `/value` count, the per-entry
 * counts of multi-entry mode, nor the `dataSource` GraphQL path.
 */

import { mount } from '@vue/test-utils'

// `mock`-prefixed names are the only out-of-scope vars a jest.mock factory may
// reference. Declared with var so hoisting keeps them defined.
var mockBusHandlers = {}
var mockDsRefetch = jest.fn()

// Capture bus subscriptions so they can be fired by hand. Guarded the same way
// CnChartWidget.refresh.spec.js is: @nextcloud/auth subscribes at module load,
// before the hoisted var is assigned, and that subscription is irrelevant here.
jest.mock('@nextcloud/event-bus', () => ({
	subscribe: jest.fn((channel, cb) => { if (mockBusHandlers) mockBusHandlers[channel] = cb }),
	unsubscribe: jest.fn((channel) => { if (mockBusHandlers) delete mockBusHandlers[channel] }),
	emit: jest.fn(),
}))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(() => Promise.resolve({ data: { value: 1 } })) },
}))

jest.mock('../../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({
		data: { value: null },
		loading: { value: false },
		error: { value: null },
		refetch: mockDsRefetch,
	}),
}))

const axios = require('@nextcloud/axios').default
const CnStatsBlockWidget = require('../../../src/components/CnStatsBlockWidget/CnStatsBlockWidget.vue').default

const StatsBlockStub = {
	name: 'CnStatsBlock',
	props: ['title', 'count', 'countLabel', 'loading', 'variant', 'clickable', 'route', 'showZeroCount', 'horizontal'],
	template: '<div class="stats-stub" />',
}

/**
 * Let the lazy axios/router imports and the fetch promises settle.
 *
 * @return {Promise<void>}
 */
async function flush() {
	for (let i = 0; i < 4; i++) {
		await new Promise((resolve) => setTimeout(resolve))
	}
}

const mountWidget = (propsData) => mount(CnStatsBlockWidget, {
	propsData,
	stubs: { CnStatsBlock: StatsBlockStub },
})

const dataSource = { register: 'openconnector', schema: 'source' }

beforeEach(() => {
	jest.clearAllMocks()
	for (const k of Object.keys(mockBusHandlers)) delete mockBusHandlers[k]
})

describe('CnStatsBlockWidget — page-level refresh', () => {
	it('subscribes to cn:page:refresh on mount', () => {
		mountWidget({ dataSource })
		expect(mockBusHandlers['cn:page:refresh']).toBeInstanceOf(Function)
	})

	it('re-runs the REST count when the page refreshes', async () => {
		const wrapper = mountWidget({ dataSource })
		await flush()
		const initial = axios.get.mock.calls.length
		expect(initial).toBeGreaterThan(0)

		mockBusHandlers['cn:page:refresh']({})
		await flush()
		expect(axios.get.mock.calls.length).toBeGreaterThan(initial)
		wrapper.unmount()
	})

	it('re-runs the GraphQL path too', () => {
		mountWidget({ dataSource: { graphql: '{ x }' } })
		mockBusHandlers['cn:page:refresh']({})
		expect(mockDsRefetch).toHaveBeenCalledTimes(1)
	})

	it('re-runs the per-entry counts of multi-entry mode', async () => {
		const wrapper = mountWidget({
			entries: [
				{ title: 'A', register: 'openconnector', schema: 'source' },
				{ title: 'B', register: 'openconnector', schema: 'job' },
			],
		})
		await flush()
		const initial = axios.get.mock.calls.length
		expect(initial).toBeGreaterThan(0)

		mockBusHandlers['cn:page:refresh']({})
		await flush()
		expect(axios.get.mock.calls.length).toBeGreaterThan(initial)
		wrapper.unmount()
	})

	it('refreshes whatever widget the payload names', async () => {
		// The tile carries no widget id — a page refresh refreshes the page, and
		// filtering on the payload would make the action a no-op here.
		const wrapper = mountWidget({ dataSource })
		await flush()
		const initial = axios.get.mock.calls.length

		mockBusHandlers['cn:page:refresh']({ widgetId: 'some-other-dashboard' })
		await flush()
		expect(axios.get.mock.calls.length).toBeGreaterThan(initial)
		wrapper.unmount()
	})

	it('exposes a ref-callable refresh() for parity with the other data widgets', () => {
		const wrapper = mountWidget({ dataSource: { graphql: '{ x }' } })
		wrapper.vm.refresh()
		expect(mockDsRefetch).toHaveBeenCalledTimes(1)
	})

	it('unsubscribes on destroy', () => {
		const { unsubscribe } = require('@nextcloud/event-bus')
		mountWidget({ dataSource }).unmount()
		expect(unsubscribe).toHaveBeenCalledWith('cn:page:refresh', expect.any(Function))
	})
})
