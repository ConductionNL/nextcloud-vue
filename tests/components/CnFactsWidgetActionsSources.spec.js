/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnFactsWidget: declared actions, a source read by filter, an endpoint source,
 * rows answered by the source, and entry templates.
 *
 * What is guarded: `actions[]` render as action buttons with `@source.<field>`
 * resolved, hidden by a `visibleWhen` on the record shown and by `adminOnly`
 * for a non-admin; a `source` without an id reads the first match of its
 * `filter` in `sort` order; `endpointSource` reads an app endpoint like a stat
 * tile does, and `emptyWhen` shows the empty text; `rowsPath` draws the rows the
 * source answers; an entry's `template` and `suffix`; `format: number`; and a
 * page refresh reads the source again, so a "Try again" action shows its result.
 *
 * @spec openspec/changes/facts-actions-and-sources/specs/facts-widget/spec.md#requirement-facts-can-carry-declared-actions
 */
var mockGet = jest.fn()
var mockPost = jest.fn()
var mockUser = { uid: 'kassa', isAdmin: false }

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

jest.mock('@nextcloud/auth', () => ({
	__esModule: true,
	getCurrentUser: () => mockUser,
	getRequestToken: () => 'token',
}))

import { emit } from '@nextcloud/event-bus'
import { mount } from '@vue/test-utils'
import { invalidateEndpointSourceCache } from '../../src/composables/useEndpointSource.js'

import '../../src/components/CnFactsWidget/index.js'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Mount the widget.
 *
 * @param {object} propsData The props.
 * @param {object} [provide] Extra provides.
 * @return {object} The wrapper.
 */
function mountFacts(propsData, provide = {}) {
	return mount(CnFactsWidget, {
		propsData,
		provide,
		stubs: {
			NcLoadingIcon: true,
			CnActionButtons: {
				name: 'CnActionButtons',
				props: ['actions'],
				template: '<div class="stub-actions"><button v-for="a in actions" :key="a.id" :data-id="a.id">{{ a.label }}</button></div>',
			},
		},
	})
}

/**
 * The actions handed to the action buttons.
 *
 * @param {object} wrapper The facts widget.
 * @return {Array<object>}
 */
function drawnActions(wrapper) {
	const buttons = wrapper.findComponent({ name: 'CnActionButtons' })
	return buttons.exists() ? buttons.props('actions') : []
}

const payment = { id: 'pay-1', status: 'failed', provider: 'mollie', amount: 12.5, currency: 'EUR' }

beforeEach(() => {
	mockGet.mockReset()
	mockPost.mockReset()
	mockUser = { uid: 'kassa', isAdmin: false }
	invalidateEndpointSourceCache()
})

describe('CnFactsWidget: actions[]', () => {
	const actions = [
		{ id: 'retry', label: 'Try again', type: 'api-call', method: 'POST', url: '/apps/pipelinq/api/payments/@source.id/retry', visibleWhen: { field: 'status', op: 'in', value: ['failed', 'expired'] } },
		{ id: 'capture', label: 'Capture', type: 'api-call', url: '/apps/pipelinq/api/payments/@source.id/capture', visibleWhen: { field: 'status', value: 'authorized' } },
		{ id: 'reverse', label: 'Reverse', type: 'open-form', adminOnly: true, endpoint: { url: '/apps/pipelinq/api/payments/@source.id/reverse', method: 'POST' } },
	]

	it('draws the actions whose condition holds on the record shown, with @source tokens resolved', async () => {
		const w = mountFacts({ objectData: payment, content: { fields: [{ path: 'status', label: 'Status' }], actions } })
		await flush()
		await w.vm.$nextTick()
		const drawn = drawnActions(w)
		expect(drawn.map((a) => a.id)).toEqual(['retry'])
		expect(drawn[0].url).toBe('/apps/pipelinq/api/payments/pay-1/retry')
		// The condition is settled here, against the record; the buttons do not ask again.
		expect(drawn[0].visibleWhen).toBeUndefined()
	})

	it('shows adminOnly actions to an admin only', async () => {
		mockUser = { uid: 'admin', isAdmin: true }
		const w = mountFacts({ objectData: payment, content: { fields: [{ path: 'status', label: 'Status' }], actions } })
		await flush()
		await w.vm.$nextTick()
		expect(drawnActions(w).map((a) => a.id)).toEqual(['retry', 'reverse'])
		expect(drawnActions(w)[1].endpoint.url).toBe('/apps/pipelinq/api/payments/pay-1/reverse')
	})

	it('hides an action whose @source token does not resolve', async () => {
		const w = mountFacts({ objectData: { status: 'failed' }, content: { fields: [{ path: 'status', label: 'Status' }], actions: [actions[0]] } })
		await flush()
		expect(drawnActions(w)).toEqual([])
	})

	it('reads the source again on a page refresh, so a retried payment shows its new state', async () => {
		mockGet
			.mockResolvedValueOnce({ data: { ...payment } })
			.mockResolvedValueOnce({ data: { ...payment, status: 'paid' } })
		const w = mountFacts({
			objectId: 'tx-1',
			content: {
				source: { url: '/apps/pipelinq/api/pos-transactions/@objectId/payment' },
				fields: [{ path: 'status', label: 'Status', map: { failed: 'Failed', paid: 'Paid' } }],
				actions: [actions[0]],
			},
		})
		await flush()
		expect(w.find('[data-testid="cn-fact-status"]').text()).toContain('Failed')
		expect(drawnActions(w).map((a) => a.id)).toEqual(['retry'])
		emit('cn:page:refresh', {})
		await flush()
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(2)
		expect(w.find('[data-testid="cn-fact-status"]').text()).toContain('Paid')
		expect(drawnActions(w)).toEqual([])
		w.unmount()
	})
})

describe('CnFactsWidget: a source read by filter and sort', () => {
	it('reads the first match in sort order', async () => {
		mockGet.mockResolvedValue({ data: { results: [{ id: 'd-2', expected: 100, actual: 98 }], total: 3 } })
		const w = mountFacts({
			objectId: 'shift-1',
			content: {
				source: { register: 'pipelinq', schema: 'cashDiff', filter: { shift: '@objectId' }, sort: { field: 'createdAt', dir: 'desc' } },
				fields: [{ path: 'actual', label: 'Counted' }],
			},
		})
		await flush()
		expect(mockGet).toHaveBeenCalledTimes(1)
		const [url, config] = mockGet.mock.calls[0]
		expect(url).toBe('/index.php/apps/openregister/api/objects/pipelinq/cashDiff')
		expect(config.params).toEqual({ shift: 'shift-1', '_order[createdAt]': 'desc', _limit: 1 })
		expect(w.find('[data-testid="cn-fact-actual"]').text()).toContain('98')
	})

	it('shows the empty text when nothing matches', async () => {
		mockGet.mockResolvedValue({ data: { results: [], total: 0 } })
		const w = mountFacts({
			objectId: 'shift-1',
			content: { source: { register: 'pipelinq', schema: 'cashDiff', filter: { shift: '@objectId' } }, fields: [{ path: 'actual', label: 'Counted' }], emptyText: 'No count yet' },
		})
		await flush()
		expect(w.find('[data-testid="cn-facts-empty"]').text()).toBe('No count yet')
	})

	it('sends no request while a filter token is unresolved', async () => {
		mountFacts({ content: { source: { register: 'pipelinq', schema: 'cashDiff', filter: { shift: '@objectId' } }, fields: [{ path: 'actual', label: 'Counted' }] } })
		await flush()
		expect(mockGet).not.toHaveBeenCalled()
	})
})

describe('CnFactsWidget: endpointSource', () => {
	it('reads an app endpoint at its responsePath, with the object tokens', async () => {
		mockGet.mockResolvedValue({ data: { summary: { nps: 42.25, count: 12, trend: 'up' } } })
		const w = mountFacts({
			objectId: 'c-1',
			content: {
				endpointSource: { url: '/apps/pipelinq/api/clients/@objectId/satisfaction', responsePath: 'summary' },
				fields: [
					{ path: 'nps', label: 'NPS', format: 'number', decimals: 1 },
					{ path: 'trend', label: 'Trend', map: { up: 'Going up' } },
				],
			},
		})
		await flush()
		expect(mockGet.mock.calls[0][0]).toBe('/index.php/apps/pipelinq/api/clients/c-1/satisfaction')
		expect(w.find('[data-testid="cn-fact-nps"] dd').text()).toMatch(/^42[.,]3$/)
		expect(w.find('[data-testid="cn-fact-trend"] dd').text()).toBe('Going up')
	})

	it('shows the empty text when the emptyWhen path holds', async () => {
		mockGet.mockResolvedValue({ data: { empty: true, nps: 0 } })
		const w = mountFacts({
			objectId: 'c-1',
			content: { endpointSource: { url: '/apps/pipelinq/api/clients/@objectId/satisfaction' }, emptyWhen: 'empty', fields: [{ path: 'nps', label: 'NPS' }], emptyText: 'No responses yet' },
		})
		await flush()
		expect(w.find('[data-testid="cn-facts-empty"]').text()).toBe('No responses yet')
	})
})

describe('CnFactsWidget: rowsPath', () => {
	it('draws the label/value rows the source answers, after the declared fields', async () => {
		const view = { title: 'Request 12', bespoke: { rows: [{ label: 'Status', value: 'In progress' }, { label: 'Empty', value: '' }, { label: 'Received', value: '2 Oct' }] } }
		const w = mountFacts({ objectData: view, content: { fields: [{ as: 'title', path: 'title' }], rowsPath: 'bespoke.rows' } })
		await flush()
		const rows = w.findAll('.cn-facts-widget__row')
		expect(rows.length).toBe(2)
		expect(rows.at(0).find('dt').text()).toBe('Status')
		expect(rows.at(0).find('dd').text()).toBe('In progress')
		expect(rows.at(1).find('dd').text()).toBe('2 Oct')
		expect(w.find('.cn-facts-widget__title').text()).toBe('Request 12')
	})
})

describe('CnFactsWidget: template and suffix', () => {
	const product = { available: 12, unit: 'pcs', weight: 2.5 }

	it('fills a template from the record', async () => {
		const w = mountFacts({ objectData: product, content: { fields: [{ key: 'stock', label: 'Stock', template: '{available} {unit}' }] } })
		expect(w.find('[data-testid="cn-fact-stock"] dd').text()).toBe('12 pcs')
	})

	it('drops a template whose placeholders are all empty', async () => {
		const w = mountFacts({ objectData: {}, content: { fields: [{ key: 'stock', label: 'Stock', template: '{available} {unit}' }], emptyText: 'Nothing' } })
		expect(w.find('[data-testid="cn-facts-empty"]').exists()).toBe(true)
	})

	it('adds a suffix to a value, and not to an empty one', async () => {
		const w = mountFacts({ objectData: product, content: { fields: [{ path: 'weight', label: 'Weight', suffix: ' kg' }, { path: 'missing', label: 'Missing', suffix: ' kg' }] } })
		expect(w.find('[data-testid="cn-fact-weight"] dd').text()).toBe('2.5 kg')
		expect(w.find('[data-testid="cn-fact-missing"]').exists()).toBe(false)
	})
})
