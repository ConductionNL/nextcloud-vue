/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab is keyed on its `id`, else its place in `content.tabs`, never on the
 * widget its panel happens to start with. A stack whose first card turns
 * visible once the record arrives keeps its panel and its place (DqBezwaar).
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-decision', type: 'custom', title: 'Decision', visibleWhen: { field: 'state', op: 'eq', value: 'decided' } },
	{ id: 'w-data', type: 'data', title: 'Objection' },
	{ id: 'w-notes', type: 'text', title: 'Notes' },
	{ id: 'w-docs', type: 'custom', title: 'Documents' },
]

/**
 * @param {Array} tabs The `content.tabs`.
 * @param {object} objectData The record.
 * @return {object} The wrapper.
 */
function mountTabs(tabs, objectData) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: WIDGETS, objectData },
		global: {
			stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' } },
		},
	})
}

const hostFor = (w, id) => w.findAll('.host').find((h) => h.text() === id)

describe('CnTabsWidget tab keys', () => {
	const tabs = [
		{ id: 'overview', widgetIds: ['w-decision', 'w-data', 'w-notes'], label: 'Overview' },
		{ id: 'documents', widgetId: 'w-docs', label: 'Documents' },
	]

	it('keys a tab on its id', () => {
		const w = mountTabs(tabs, { id: 'b1', state: 'open' })
		expect(w.vm.resolvedTabs.map((tab) => tab.key)).toEqual(['overview', 'documents'])
	})

	it('keys a tab without an id on its place', () => {
		const w = mountTabs([{ widgetIds: ['w-decision', 'w-data'] }, 'w-docs'], { id: 'b1', state: 'open' })
		expect(w.vm.resolvedTabs.map((tab) => tab.key)).toEqual(['tab-0', 'tab-1'])
	})

	it('keeps the panel when the first card turns visible late', async () => {
		const w = mountTabs(tabs, { id: 'b1', state: 'open' })
		await nextTick()
		const before = hostFor(w, 'w-notes').element
		const key = w.vm.resolvedTabs[0].key

		await w.setProps({ objectData: { id: 'b1', state: 'decided' } })
		await nextTick()

		expect(w.vm.resolvedTabs[0].key).toBe(key)
		expect(hostFor(w, 'w-decision')).toBeTruthy()
		expect(hostFor(w, 'w-notes').element).toBe(before)
	})

	it('keeps the open tab open when another tab\'s first card turns visible', async () => {
		const w = mountTabs(tabs, { id: 'b1', state: 'open' })
		await nextTick()
		w.vm.activeIndex = 1
		await nextTick()

		await w.setProps({ objectData: { id: 'b1', state: 'decided' } })
		await nextTick()

		expect(w.vm.activeTab.id).toBe('documents')
	})
})
