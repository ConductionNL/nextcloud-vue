/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab counts its list on the server (screens-tab-counts-parity). The boards
 * draw "Zaken 2, Contactmomenten 3" on a contact and "Sessies 3, Berichten 2"
 * on a portal account, numbers no record field carries; the child widget's own
 * list does.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'
import { fetchListTotal } from '../../src/utils/fetchFilterCounts.js'

jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchListTotal: jest.fn(),
}))

const WIDGETS = [
	{ id: 'w-cases', type: 'object-list', title: 'Cases', content: { register: 'dossiq', schema: 'case', filter: { requester: '@objectId' } } },
	{ id: 'w-moments', type: 'object-list', title: 'Contact moments', content: { register: 'dossiq', schema: 'contactmoment', filter: { contact: '@objectId' } } },
	{ id: 'w-card', type: 'data', title: 'Contact' },
]

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0))
		await nextTick()
	}
}

function mountTabs(tabs, extra = {}) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: WIDGETS, objectId: 'p-1', objectData: { id: 'p-1', notes: [1, 2] }, register: 'dossiq', schema: 'person', ...extra },
		global: { stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div />' } } },
	})
}

function tabTexts(w) {
	return w.findAll('[role="tab"]').map((t) => t.text().replace(/\s+/g, ' ').trim())
}

beforeEach(() => {
	fetchListTotal.mockReset()
	fetchListTotal.mockImplementation((register, schema) => Promise.resolve(schema === 'case' ? 2 : 3))
})

describe('CnTabsWidget countFrom', () => {
	it('counts the child widget list, with its filter and the record context', async () => {
		const w = mountTabs([{ widgetId: 'w-card' }, { widgetId: 'w-cases', countFrom: 'widget' }, { widgetId: 'w-moments', countFrom: 'widget' }])
		await flush()
		expect(fetchListTotal).toHaveBeenCalledWith('dossiq', 'case', { requester: '@objectId' }, expect.objectContaining({ objectId: 'p-1' }))
		const texts = tabTexts(w)
		expect(texts[0]).toBe('Contact')
		expect(texts[1]).toContain('2')
		expect(texts[2]).toContain('3')
	})

	it('counts a list the tab names itself', async () => {
		const w = mountTabs([{ widgetId: 'w-card', countFrom: { register: 'dossiq', schema: 'case', filter: { requester: '@objectId' } } }])
		await flush()
		expect(fetchListTotal).toHaveBeenCalledTimes(1)
		expect(tabTexts(w)[0]).toContain('2')
	})

	it('lets count and countField win, and asks nothing for them', async () => {
		const w = mountTabs([{ widgetId: 'w-cases', countFrom: 'widget', count: 7 }, { widgetId: 'w-moments', countFrom: 'widget', countField: 'notes' }])
		await flush()
		const texts = tabTexts(w)
		expect(texts[0]).toContain('7')
		expect(texts[1]).toContain('2')
	})

	it('shows no number when the count fails or the child has no list', async () => {
		fetchListTotal.mockImplementation(() => Promise.reject(new Error('500')))
		const w = mountTabs([{ widgetId: 'w-cases', countFrom: 'widget' }, { widgetId: 'w-card', countFrom: 'widget' }])
		await flush()
		expect(fetchListTotal).toHaveBeenCalledTimes(1)
		expect(tabTexts(w)).toEqual(['Cases', 'Contact'])
	})

	it('asks nothing without countFrom', async () => {
		mountTabs([{ widgetId: 'w-cases' }])
		await flush()
		expect(fetchListTotal).not.toHaveBeenCalled()
	})

	it('counts again for another record', async () => {
		const w = mountTabs([{ widgetId: 'w-cases', countFrom: 'widget' }])
		await flush()
		fetchListTotal.mockImplementation(() => Promise.resolve(5))
		await w.setProps({ objectId: 'p-2' })
		await flush()
		expect(fetchListTotal).toHaveBeenLastCalledWith('dossiq', 'case', { requester: '@objectId' }, expect.objectContaining({ objectId: 'p-2' }))
		expect(tabTexts(w)[0]).toContain('5')
	})
})
