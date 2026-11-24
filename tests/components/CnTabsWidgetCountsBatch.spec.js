/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The tabs of a detail page count their lists in ONE batch request
 * (`POST /apps/openregister/api/objects/counts`), not one list request per
 * tab, and a tab its own record condition hides counts nothing until it shows.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

jest.mock('../../src/utils/appInstalled.js', () => ({
	__esModule: true,
	isAppInstalled: jest.fn(() => true),
}))

const WIDGETS = [
	{ id: 'w-card', type: 'data', title: 'Case' },
	{ id: 'w-hearings', type: 'object-list', title: 'Hearings', content: {} },
	{ id: 'w-reports', type: 'object-list', title: 'Reports', content: {} },
	{ id: 'w-moments', type: 'object-list', title: 'Contact moments', content: {} },
	{ id: 'w-bids', type: 'object-list', title: 'Bids', content: {} },
	{ id: 'w-tasks', type: 'object-list', title: 'Tasks', content: {} },
]

const TABS = [
	{ widgetId: 'w-card' },
	{ widgetId: 'w-hearings', countFrom: { register: 'dossiq', schema: 'hearingSession', filter: { case: '@objectId' } } },
	{ widgetId: 'w-reports', countFrom: { register: 'dossiq', schema: 'advisoryReport', filter: { case: '@objectId', status: 'final' } } },
	{ widgetId: 'w-moments', countFrom: { register: 'dossiq', schema: 'contactmoment', filter: { case: '@objectId' } } },
]

const BIDS = { widgetId: 'w-bids', visibleWhen: { field: 'caseType', op: 'eq', value: 'tender' }, countFrom: { register: 'dossiq', schema: 'bid', filter: { case: '@objectId' } } }

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountTabs(tabs, objectData = { id: 'c-1', caseType: 'permit' }) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: WIDGETS, objectId: 'c-1', objectData, register: 'dossiq', schema: 'case' },
		global: { stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div />' } } },
	})
}

function tabTexts(w) {
	return w.findAll('[role="tab"]').map((t) => t.text().replace(/\s+/g, ' ').trim())
}

function countsCalls() {
	return global.fetch.mock.calls.filter(([url]) => String(url).includes('/apps/openregister/api/objects/counts'))
}

function answerCounts() {
	global.fetch = jest.fn((url, init) => {
		if (String(url).includes('/api/objects/counts')) {
			const { counts } = JSON.parse(init.body)
			const totals = { hearingSession: 4, advisoryReport: 1, contactmoment: 9, bid: 3 }
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: counts.map((c) => ({ count: totals[c.schema] })) }) })
		}
		if (String(url).includes('/apps/openregister/api/flow-tasks')) {
			return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [{ id: 't1' }, { id: 't2' }] }) })
		}
		return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
	})
}

afterEach(() => {
	delete global.fetch
})

describe('CnTabsWidget counts in one request', () => {
	it('sends every list count of the tabs in one batch request', async () => {
		answerCounts()
		const w = mountTabs(TABS)
		await flush()
		const calls = countsCalls()
		expect(calls).toHaveLength(1)
		expect(calls[0][1].method).toBe('POST')
		const { counts } = JSON.parse(calls[0][1].body)
		expect(counts).toEqual([
			{ register: 'dossiq', schema: 'hearingSession', filter: { case: 'c-1' } },
			{ register: 'dossiq', schema: 'advisoryReport', filter: { case: 'c-1', status: 'final' } },
			{ register: 'dossiq', schema: 'contactmoment', filter: { case: 'c-1' } },
		])
		expect(global.fetch).toHaveBeenCalledTimes(1)
		const texts = tabTexts(w)
		expect(texts[1]).toContain('4')
		expect(texts[2]).toContain('1')
		expect(texts[3]).toContain('9')
	})

	it('keeps an endpoint count as its own request beside the batch', async () => {
		answerCounts()
		const w = mountTabs([...TABS, { widgetId: 'w-tasks', countFrom: { endpoint: '/apps/openregister/api/flow-tasks?object=@objectId', field: 'results' } }])
		await flush()
		expect(countsCalls()).toHaveLength(1)
		expect(global.fetch).toHaveBeenCalledTimes(2)
		expect(tabTexts(w)[4]).toContain('2')
	})

	it('does not count a tab its record condition hides', async () => {
		answerCounts()
		mountTabs([...TABS, BIDS])
		await flush()
		const { counts } = JSON.parse(countsCalls()[0][1].body)
		expect(counts.map((c) => c.schema)).toEqual(['hearingSession', 'advisoryReport', 'contactmoment'])
	})

	it('counts a hidden tab once it shows', async () => {
		answerCounts()
		const w = mountTabs([...TABS, BIDS])
		await flush()
		await w.setProps({ objectData: { id: 'c-1', caseType: 'tender' } })
		await flush()
		const calls = countsCalls()
		expect(calls).toHaveLength(2)
		expect(JSON.parse(calls[1][1].body).counts.map((c) => c.schema)).toContain('bid')
		expect(tabTexts(w)[4]).toContain('3')
	})

	it('shows no numbers, without throwing, when the counts cannot be read', async () => {
		global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }))
		const w = mountTabs(TABS)
		await flush()
		expect(countsCalls()).toHaveLength(1)
		expect(tabTexts(w)).toEqual(['Case', 'Hearings', 'Reports', 'Contact moments'])
	})
})
