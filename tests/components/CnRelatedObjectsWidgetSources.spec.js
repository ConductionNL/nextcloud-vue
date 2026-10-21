/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Related content OpenRegister's relations do not return, read from app
 * endpoints: scheduled follow-ups that open nothing and can be stopped, typed
 * links grouped by the label the app answers, a parent named only by a
 * readable title, and a footer action. Ported from dossiq's CasePlannedWidget
 * specs (casePlannedWidget, relatedCasesCard).
 *
 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-related-objects-can-read-extra-sections-from-endpoints
 */
var mockGet = jest.fn()
var mockRequest = jest.fn()

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: (...a) => mockGet(...a), request: (...a) => mockRequest(...a) } }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))
jest.mock('@nextcloud/router', () => ({ generateUrl: (tpl, params = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`) }))

import { mount } from '@vue/test-utils'
import CnRelatedObjectsWidget from '../../src/components/CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import { integrations } from '../../src/integrations/registry.js'

const stubs = {
	CnWidgetWrapper: { template: '<div class="cn-widget-wrapper-stub"><slot /><slot name="footer" /></div>' },
	CnIcon: true,
	FileTreeOutline: true,
	Paperclip: true,
	ChevronRight: true,
	NcButton: { template: '<button v-bind="$attrs"><slot /></button>' },
	RouterLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' },
}

const SELF = { id: 'r-1', parentItem: 'p-1', '@self': { register: 'x', schema: 'item', id: 'r-1' } }

const PLANNED = [
	{ id: 'flow-1', title: 'Yearly inspection', recurrence: 'yearly', occurrences: [{ id: 'o-1', title: 'Inspection 2025' }] },
	{ id: 'flow-2', title: 'One-off check', recurrence: 'none', occurrences: [] },
]
const RELATIONS = [
	{ itemId: 'c-1', title: 'Road works', displayLabel: 'Waits on' },
	{ itemId: 'c-2', title: '8afb946b-1111-2222-3333-444455556666', displayLabel: 'Waits on' },
	{ itemId: 'c-3', title: 'Lighting', kind: 'follow-up', notes: 'phase 2' },
]

const CONTENT = {
	showObjects: false,
	showFiles: false,
	layout: 'sections',
	extraSources: [
		{
			key: 'planned',
			label: 'Planned items',
			endpoint: '/apps/x/api/item/@objectId/planned',
			path: 'results',
			itemLabel: '{title}',
			static: true,
			rowActions: [{ label: 'Stop series', endpoint: '/apps/x/api/item/@objectId/planned/{id}/stop', when: { field: 'recurrence', op: 'neq', value: 'none' } }],
			children: { path: 'occurrences', label: '{title}', route: { name: 'ItemDetail', params: { id: '{id}' } } },
		},
		{
			key: 'relations',
			endpoint: '/apps/x/api/items/@objectId/relations',
			path: 'results',
			groupBy: ['{displayLabel}', '{kind}'],
			groupLabels: { 'follow-up': 'Follow-up' },
			itemLabel: ['{title} ({notes})', '{title}'],
			requireLabel: true,
			rowRoute: { name: 'ItemDetail', params: { id: '{itemId}' } },
		},
	],
	referenceSections: [{ key: 'parent', label: 'Parent item', field: 'parentItem', register: 'x', schema: 'item', route: { name: 'ItemDetail', params: { id: '{id}' } } }],
	footerActions: [{ label: 'Plan follow-up', type: 'open-modal', target: 'PlanDialog', props: { itemId: '@objectId' } }],
}

function serve(parent = { id: 'p-1', title: 'Main permit' }) {
	mockGet.mockImplementation((url) => {
		if (url.endsWith('/planned')) {
			return Promise.resolve({ data: { results: PLANNED } })
		}
		if (url.endsWith('/relations')) {
			return Promise.resolve({ data: { results: RELATIONS } })
		}
		if (url.includes('/objects/x/item/p-1')) {
			return parent instanceof Error ? Promise.reject(parent) : Promise.resolve({ data: parent })
		}
		return Promise.reject(new Error('404'))
	})
}

async function mountWidget(provide = {}) {
	global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [], total: 0 }) }))
	const push = jest.fn()
	const w = mount(CnRelatedObjectsWidget, { props: { objectData: SELF, ...CONTENT }, global: { stubs, provide, mocks: { $router: { push } } } })
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
	return { w, push }
}

const headings = (w) => w.findAll('[data-testid="cn-related-section"] h4').map((h) => h.text())

beforeEach(() => {
	integrations.__resetForTests()
	mockGet.mockReset()
	mockRequest.mockReset()
})

afterEach(() => {
	delete global.fetch
})

describe('CnRelatedObjectsWidget — sections read from app endpoints', () => {
	it('adds a section per source, a group per relation label, and the parent', async () => {
		serve()
		const { w } = await mountWidget()
		expect(headings(w)).toEqual(['Planned items', 'Waits on', 'Follow-up', 'Parent item'])
	})

	it('leaves out a row named only by an id, and a parent without a readable title', async () => {
		serve({ id: 'p-1', title: '8afb946b-1111-2222-3333-444455556666' })
		const { w } = await mountWidget()
		expect(w.text()).toContain('Road works')
		expect(w.text()).not.toContain('8afb946b')
		expect(headings(w)).not.toContain('Parent item')
	})

	it('names a typed link with its notes, and opens it', async () => {
		serve()
		const { w, push } = await mountWidget()
		const row = w.findAll('[data-testid="cn-related-section"]')[2].find('[role="button"]')
		expect(row.text()).toContain('Lighting (phase 2)')
		await row.trigger('click')
		expect(push).toHaveBeenCalledWith({ name: 'ItemDetail', params: { id: 'c-3' } })
	})
})

describe('CnRelatedObjectsWidget — a source that fails', () => {
	it('is logged rather than drawn as an empty section, and leaves the rest alone', async () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		mockGet.mockImplementation((url) => (url.endsWith('/planned') ? Promise.reject(new Error('500')) : Promise.resolve({ data: { results: RELATIONS } })))
		const { w } = await mountWidget()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('planned'), expect.anything())
		expect(headings(w)).toContain('Waits on')
		expect(headings(w)).not.toContain('Planned items')
		warn.mockRestore()
	})
})

describe('CnRelatedObjectsWidget — the tabbed panel', () => {
	it('draws a planned row that opens nothing, its occurrences as links and a stop action on a series only', async () => {
		serve()
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [], total: 0 }) }))
		const w = mount(CnRelatedObjectsWidget, { props: { objectData: SELF, ...CONTENT, layout: 'tabs' }, global: { stubs, mocks: { $router: { push: jest.fn() } } } })
		for (let i = 0; i < 6; i++) {
			await new Promise((resolve) => setTimeout(resolve, 0))
		}
		expect(w.findAll('[data-testid="cn-related-static-row"]')).toHaveLength(2)
		expect(JSON.parse(w.find('[data-testid="cn-related-children"] a').attributes('data-to'))).toEqual({ name: 'ItemDetail', params: { id: 'o-1' } })
		const stops = w.findAll('[data-testid="cn-related-row-action"]')
		expect(stops).toHaveLength(1)
		mockRequest.mockResolvedValue({ data: {} })
		await stops[0].trigger('click')
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(mockRequest).toHaveBeenCalledWith({ method: 'post', url: '/apps/x/api/item/r-1/planned/flow-1/stop' })
	})

	it('shows the server refusal of a stop', async () => {
		serve()
		global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [], total: 0 }) }))
		const w = mount(CnRelatedObjectsWidget, { props: { objectData: SELF, ...CONTENT, layout: 'tabs' }, global: { stubs, mocks: { $router: { push: jest.fn() } } } })
		for (let i = 0; i < 6; i++) {
			await new Promise((resolve) => setTimeout(resolve, 0))
		}
		mockRequest.mockRejectedValue({ response: { data: { message: 'Only the coordinator may stop a series.' } } })
		await w.find('[data-testid="cn-related-row-action"]').trigger('click')
		for (let i = 0; i < 3; i++) {
			await new Promise((resolve) => setTimeout(resolve, 0))
		}
		expect(w.find('[data-testid="cn-related-action-error"]').text()).toBe('Only the coordinator may stop a series.')
	})
})

describe('CnRelatedObjectsWidget — footer actions', () => {
	it('dispatches with the record tokens resolved', async () => {
		serve()
		const dispatch = jest.fn()
		const { w } = await mountWidget({ cnDispatchAction: dispatch })
		await w.find('[data-testid="cn-related-footer-action"]').trigger('click')
		expect(dispatch).toHaveBeenCalledWith({ type: 'open-modal', target: 'PlanDialog', props: { itemId: 'r-1' } })
	})
})
