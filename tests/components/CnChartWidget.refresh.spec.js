/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnChartWidget's refresh wiring (#6): the chart re-queries
 * its dataSource when the `cn:widget:refresh` event-bus channel fires
 * with a matching widgetId, and exposes a ref-callable refresh().
 */

// `mock`-prefixed names are the only out-of-scope vars jest.mock factories
// may reference. Declared with var so hoisting keeps them defined.
var mockBusHandlers = {}
var mockRefetch = jest.fn()

jest.mock('vue-apexcharts', () => ({ name: 'vue-apexcharts-stub', render: (h) => h('div') }), { virtual: true })

// Capture event-bus subscriptions so we can fire them manually.
jest.mock('@nextcloud/event-bus', () => ({
	subscribe: jest.fn((channel, cb) => { mockBusHandlers[channel] = cb }),
	unsubscribe: jest.fn((channel) => { delete mockBusHandlers[channel] }),
	emit: jest.fn(),
}))

// Mock useDataSource so we can assert refetch() is invoked.
jest.mock('../../src/composables/useDataSource.js', () => ({
	useDataSource: () => ({
		data: { value: null },
		loading: { value: false },
		error: { value: null },
		refetch: mockRefetch,
	}),
}))

import { mount } from '@vue/test-utils'
import CnChartWidget from '../../src/components/CnChartWidget/CnChartWidget.vue'

const dataSource = { register: 'openconnector', schema: 'job_log', bucket: { field: 'created', interval: 'day' } }

const mountChart = (props = {}) => mount(CnChartWidget, {
	propsData: { dataSource, ...props },
})

describe('CnChartWidget — refresh (#6)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		for (const k of Object.keys(mockBusHandlers)) delete mockBusHandlers[k]
	})

	it('subscribes to cn:widget:refresh on mount', () => {
		mountChart({ widgetId: 'jobs-daily' })
		expect(mockBusHandlers['cn:widget:refresh']).toBeInstanceOf(Function)
	})

	it('refetches when the bus fires with a matching widgetId', () => {
		mountChart({ widgetId: 'jobs-daily' })
		mockBusHandlers['cn:widget:refresh']({ widgetId: 'jobs-daily' })
		expect(mockRefetch).toHaveBeenCalledTimes(1)
	})

	it('ignores bus events for a different widgetId', () => {
		mountChart({ widgetId: 'jobs-daily' })
		mockBusHandlers['cn:widget:refresh']({ widgetId: 'calls-daily' })
		expect(mockRefetch).not.toHaveBeenCalled()
	})

	it('ignores bus events when no widgetId is set', () => {
		mountChart({ widgetId: '' })
		mockBusHandlers['cn:widget:refresh']?.({ widgetId: 'anything' })
		expect(mockRefetch).not.toHaveBeenCalled()
	})

	it('exposes a ref-callable refresh() that refetches', () => {
		const wrapper = mountChart({ widgetId: 'jobs-daily' })
		wrapper.vm.refresh()
		expect(mockRefetch).toHaveBeenCalledTimes(1)
	})

	it('unsubscribes on destroy', () => {
		const { unsubscribe } = require('@nextcloud/event-bus')
		const wrapper = mountChart({ widgetId: 'jobs-daily' })
		wrapper.destroy()
		expect(unsubscribe).toHaveBeenCalledWith('cn:widget:refresh', expect.any(Function))
	})
})
