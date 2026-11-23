/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * History is the last tab under the board look: the page does not also draw
 * the activity as a body section, and the activity tab itself draws a header,
 * kind chips with counts, the visibility select and an event rail.
 *
 * @spec openspec/changes/screens-detail-page-parity/specs/detail-page-board-look/spec.md#requirement-history-is-the-last-tab
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnActivityTab from '../../src/integrations/builtin/activity/CnActivityTab.vue'
import { isActivityWidget } from '../../src/utils/headerMeta.js'

const store = {
	objects: { 'reg-case': { 'id-1': { name: 'Case' } } },
	schemas: {},
	objectTypeRegistry: {},
	registerObjectType: jest.fn(),
	fetchObject: jest.fn(async () => null),
	fetchSchema: jest.fn(async () => null),
}

const WIDGETS = [
	{ id: 'case-tabs', type: 'tabs', content: { tabs: [{ widgetId: 'case-history' }, { widgetId: 'case-docs' }] } },
	{ id: 'case-history', type: 'audit-trail', title: 'Audit trail' },
	{ id: 'case-docs', type: 'object-list', title: 'Documents' },
	{ id: 'case-loose-history', type: 'timeline', title: 'Timeline' },
]
const LAYOUT = [
	{ id: '1', widgetId: 'case-tabs', gridX: 0, gridY: 0, gridWidth: 12, gridHeight: 6 },
	{ id: '2', widgetId: 'case-history', gridX: 0, gridY: 6, gridWidth: 12, gridHeight: 4 },
	{ id: '3', widgetId: 'case-loose-history', gridX: 0, gridY: 10, gridWidth: 12, gridHeight: 4 },
]

const stubs = {
	CnDashboardGrid: { props: ['layout'], template: '<div class="grid"><span v-for="it in layout" :key="it.id" class="cell" :data-widget="it.widgetId" /></div>' },
	CnDetailWidgetHost: { template: '<div class="host" />' },
}

const cells = (w) => w.findAll('.cell').map((c) => c.attributes('data-widget'))

function mountPage(look) {
	return mount(CnDetailPage, {
		props: { title: 'Case', register: 'reg', schema: 'case', objectId: 'id-1', objectStore: store, widgets: WIDGETS, layout: LAYOUT },
		global: { stubs, provide: look ? { cnLook: look } : {} },
	})
}

describe('CnDetailPage: the activity is not also a body section', () => {
	it('drops an activity widget a tabs widget already holds, in the board look', () => {
		// The audit trail is a tab; the loose timeline is held by no tab and stays.
		expect(cells(mountPage('board'))).toEqual(['case-tabs', 'case-loose-history'])
	})

	it('draws every widget in the grid without the look', () => {
		expect(cells(mountPage(null))).toEqual(['case-tabs', 'case-history', 'case-loose-history'])
	})

	it('knows an activity widget when it sees one', () => {
		expect(isActivityWidget({ type: 'audit-trail' })).toBe(true)
		expect(isActivityWidget({ type: 'timeline' })).toBe(true)
		expect(isActivityWidget({ type: 'integration', integrationId: 'activity' })).toBe(true)
		expect(isActivityWidget({ type: 'integration', integrationId: 'files' })).toBe(false)
		expect(isActivityWidget({ type: 'object-list' })).toBe(false)
		expect(isActivityWidget(null)).toBe(false)
	})
})

const PROPS = { objectId: 'obj-1', register: 'reg', schema: 'schema' }
const now = Date.now()
const row = (overrides) => ({ id: 'r', kind: 'audit', subject: 'Status changed: from Received to In progress', actor: 'Pieter Jansen', timestamp: new Date(now).toISOString(), ...overrides })
const FEED = {
	results: [
		row({ id: 'a1', kind: 'audit' }),
		row({ id: 'f1', kind: 'file', subject: 'Document reviewed: Advice', actor: 'Lars' }),
		row({ id: 'n1', kind: 'note', subject: 'Called the applicant' }),
	],
	cursor: null,
	counts: { audit: 1, file: 1, note: 1, mail: 0, activity: 0 },
}
const ok = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve('') })

async function mountTab(look, props = {}) {
	global.fetch = jest.fn((url) => Promise.resolve(url.includes('/integrations/activity/') ? ok({ results: [] }) : ok(FEED)))
	const w = mount(CnActivityTab, { props: { ...PROPS, ...props }, global: { provide: look ? { cnLook: look } : {} } })
	await flushPromises()
	await flushPromises()
	return w
}

describe('CnActivityTab in the board look', () => {
	afterEach(() => {
		delete global.fetch
		localStorage.clear()
	})

	it('draws the header with an h2, the subtitle and an Export button', async () => {
		const w = await mountTab('board')
		const head = w.get('[data-testid="cn-activity-board-head"]')
		expect(head.get('h2').text()).toBe('History')
		expect(head.text()).toContain('newest first')
		expect(head.get('[data-testid="cn-activity-export"]').exists()).toBe(true)
		// One Export button, not two.
		expect(w.findAll('[data-testid="cn-activity-export"]')).toHaveLength(1)
	})

	it('offers Add note only when the host asks for it, and emits add-note', async () => {
		expect((await mountTab('board')).find('[data-testid="cn-activity-add-note"]').exists()).toBe(false)
		const w = await mountTab('board', { showAddNote: true })
		await w.get('[data-testid="cn-activity-add-note"]').trigger('click')
		expect(w.emitted('add-note')).toHaveLength(1)
	})

	it('keeps the kind chips with their counts', async () => {
		const w = await mountTab('board')
		expect(w.findAll('.cn-activity-tab__kind')).toHaveLength(5)
		expect(w.get('[data-testid="cn-activity-kind-count-file"]').text()).toBe('1')
	})

	it('draws every event on a rail with the verb in bold and a kind, who and when meta line', async () => {
		const w = await mountTab('board')
		const events = w.findAll('[data-testid="cn-activity-event"]')
		expect(events).toHaveLength(3)
		expect(events[0].get('strong').text()).toBe('Status changed:')
		expect(events[0].get('.cn-activity-tab__event-line').text()).toBe('Status changed: from Received to In progress')
		expect(events[1].get('.cn-activity-tab__event-meta').text()).toMatch(/^Files · Lars · /)
		expect(events[2].get('strong').text()).toBe('Called the applicant')
		expect(events[0].find('.cn-activity-tab__event-icon').exists()).toBe(true)
		expect(w.find('.cn-activity-tab__day').exists()).toBe(false)
	})

	it('keeps the day-grouped list and the old Export button without the look', async () => {
		const w = await mountTab(null)
		expect(w.find('[data-testid="cn-activity-board-head"]').exists()).toBe(false)
		expect(w.find('[data-testid="cn-activity-rail"]').exists()).toBe(false)
		expect(w.findAll('.cn-activity-tab__row')).toHaveLength(3)
		expect(w.findAll('[data-testid="cn-activity-export"]')).toHaveLength(1)
	})
})
