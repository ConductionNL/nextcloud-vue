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
var mockEpRefetch = jest.fn()

// Apexcharts is stubbed globally via jest.config.js moduleNameMapper; the
// local Vue-2 `render: (h) => h('div')` mock that lived here throws under Vue 3.

// Capture event-bus subscriptions so we can fire them manually. Guarded:
// @nextcloud/auth (imported transitively via resolveFilterTokens) subscribes
// to csrf-token-update at MODULE LOAD — before the hoisted `var` above is
// assigned. That early subscription is irrelevant here and simply dropped.
jest.mock('@nextcloud/event-bus', () => ({
	subscribe: jest.fn((channel, cb) => { if (mockBusHandlers) mockBusHandlers[channel] = cb }),
	unsubscribe: jest.fn((channel) => { if (mockBusHandlers) delete mockBusHandlers[channel] }),
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

// Mock useEndpointSource too: the page-refresh path must NOT drive its refetch
// (the real composable subscribes to that channel itself), and asserting that
// needs its refetch to be distinguishable from useDataSource's.
jest.mock('../../src/composables/useEndpointSource.js', () => ({
	useEndpointSource: () => ({
		data: { value: null },
		loading: { value: false },
		error: { value: null },
		refetch: mockEpRefetch,
	}),
	getByPath: (obj, path) => (path ? undefined : obj),
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
		wrapper.unmount()
		expect(unsubscribe).toHaveBeenCalledWith('cn:widget:refresh', expect.any(Function))
	})
})

/**
 * The page-level Refresh action broadcasts on `cn:page:refresh`, and the chart
 * used to ignore it: only useEndpointSource subscribes to that channel, so the
 * action reached endpoint-bound charts and silently did nothing for every chart
 * fed by `dataSource` — which is every chart on OpenConnector's dashboard.
 */
describe('CnChartWidget — page-level refresh', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		for (const k of Object.keys(mockBusHandlers)) delete mockBusHandlers[k]
	})

	it('subscribes to cn:page:refresh on mount', () => {
		mountChart({ widgetId: 'jobs-daily' })
		expect(mockBusHandlers['cn:page:refresh']).toBeInstanceOf(Function)
	})

	it('refetches its own sources with no widgetId to match on', () => {
		// A page refresh refreshes the whole page, so it carries no widget id —
		// and a chart placed without one must still refresh.
		mountChart({ widgetId: '' })
		mockBusHandlers['cn:page:refresh']({})
		expect(mockRefetch).toHaveBeenCalledTimes(1)
	})

	it('refetches regardless of which widget the payload names', () => {
		mountChart({ widgetId: 'jobs-daily' })
		mockBusHandlers['cn:page:refresh']({ widgetId: 'some-dashboard' })
		expect(mockRefetch).toHaveBeenCalledTimes(1)
	})

	it('leaves the endpoint source to its own subscription', () => {
		// useEndpointSource force-refetches on this same channel. A second
		// forced fetch would be a real duplicate HTTP request, not a no-op:
		// fetchSharedResponse() deletes the in-flight dedup entry when `force`
		// is set, so two back-to-back forces cannot collapse into one.
		mountChart({ widgetId: 'jobs-daily', endpointSource: { url: '/apps/x/api/y' } })
		mockBusHandlers['cn:page:refresh']({})
		expect(mockRefetch).toHaveBeenCalledTimes(1)
		expect(mockEpRefetch).not.toHaveBeenCalled()
	})

	it('still drives the endpoint source from the widget-level refresh', () => {
		// The per-widget action and the ref-callable method keep refreshing
		// everything — only the page channel splits the two halves.
		const wrapper = mountChart({ widgetId: 'jobs-daily', endpointSource: { url: '/apps/x/api/y' } })
		wrapper.vm.refresh()
		expect(mockRefetch).toHaveBeenCalledTimes(1)
		expect(mockEpRefetch).toHaveBeenCalledTimes(1)
	})

	it('unsubscribes from cn:page:refresh on destroy', () => {
		const { unsubscribe } = require('@nextcloud/event-bus')
		const wrapper = mountChart({ widgetId: 'jobs-daily' })
		wrapper.unmount()
		expect(unsubscribe).toHaveBeenCalledWith('cn:page:refresh', expect.any(Function))
	})
})
