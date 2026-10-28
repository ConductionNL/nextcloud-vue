/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * related-links-layout (board PqKassabon "Gerelateerd"): `layout: "links"`
 * shows the host's sections as plain links, one per line, a parent named by
 * a `labelTemplate`, and "Show all" opens the full tabbed view, so the files
 * and every other relation stay one click away.
 *
 * @spec openspec/changes/related-links-layout/specs/related-objects/spec.md#requirement-related-records-can-be-a-plain-list-of-links
 */
var mockGet = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), request: jest.fn() } }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (tpl, params = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`) }))

import { mount } from '@vue/test-utils'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

const stubs = {
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot name="title-meta" /><slot /><slot name="footer" /></div>' },
	CnIcon: true,
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
}

const SELF = { id: 'tx-1', shift: 's-1', '@self': { register: 'pipelinq', schema: 'posTransaction', id: 'tx-1' } }

const CONTENT = {
	layout: 'links',
	referenceSections: [{
		key: 'shift',
		label: 'Shift',
		field: 'shift',
		register: 'pipelinq',
		schema: 'cashShift',
		labelTemplate: 'Shift {floatAt|date}, {drawer}',
		route: { name: 'CashShiftDetail', params: { id: '{id}' } },
	}],
	extraSources: [{
		key: 'refunds',
		endpoint: '/apps/openregister/api/objects/pipelinq/posRefund?originalTransaction=@objectId',
		path: 'results',
		itemLabel: 'Refund {reference}',
		itemMeta: '{status}',
		rowRoute: { name: 'PosRefundDetail', params: { id: '{id}' } },
	}],
}

/**
 * Answer the reads: the shift, the refunds, and one related object.
 *
 * @return {void}
 */
function serve() {
	mockGet.mockImplementation((url) => {
		if (url.includes('/objects/pipelinq/cashShift/s-1')) {
			return Promise.resolve({ data: { id: 's-1', floatAt: '2026-10-07T08:30:00', drawer: 'Balie 2' } })
		}
		if (url.includes('posRefund')) {
			return Promise.resolve({ data: { results: [{ id: 'rf-1', reference: 'RF-2026-0058', status: 'pending' }] } })
		}
		return Promise.reject(new Error('404'))
	})
}

/**
 * Mount the widget and let its reads settle.
 *
 * @param {object} [content] The props.
 * @return {Promise<object>} The wrapper.
 */
async function mountWidget(content = CONTENT) {
	global.fetch = jest.fn((url) => Promise.resolve({
		ok: true,
		status: 200,
		json: () => Promise.resolve(String(url).includes('/uses') ? { results: [{ id: 'line-1', title: 'Afvalpas, extra', '@self': { schema: 'line' } }], total: 1 } : { results: [], total: 0 }),
	}))
	const w = mount(CnRelatedObjectsWidget, { props: { objectData: SELF, ...content }, global: { stubs, mocks: { $router: { push: jest.fn() } } } })
	for (let i = 0; i < 8; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
	return w
}

beforeEach(() => {
	integrations.__resetForTests()
	mockGet.mockReset()
})

afterEach(() => {
	delete global.fetch
})

describe('CnRelatedObjectsWidget: layout links', () => {
	it('lists the host sections as plain links, the parent named by its template', async () => {
		serve()
		const w = await mountWidget()
		const links = w.findAll('[data-testid="cn-related-links"] li').map((li) => li.text())
		// Sources come before references, as in the other layouts.
		expect(links[0]).toBe('Refund RF-2026-0058, pending')
		expect(links[1]).toMatch(/^Shift (7 okt|Oct 7), Balie 2$/)
		expect(w.find('.cn-related-objects-widget__tabs').exists()).toBe(false)
		expect(w.find('.cn-related-objects-widget__count').exists()).toBe(false)
	})

	it('opens the full view with Show all', async () => {
		serve()
		const w = await mountWidget()
		const showAll = w.find('[data-testid="cn-related-show-all"]')
		expect(showAll.exists()).toBe(true)
		await showAll.trigger('click')
		expect(w.find('[data-testid="cn-related-links"]').exists()).toBe(false)
		expect(w.find('.cn-related-objects-widget__panel').exists()).toBe(true)
	})

	it('keeps the tabs without the layout', async () => {
		serve()
		const { layout, ...rest } = CONTENT
		const w = await mountWidget(rest)
		expect(w.find('[data-testid="cn-related-links"]').exists()).toBe(false)
	})
})
