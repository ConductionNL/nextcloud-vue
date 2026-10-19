/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab that holds a single widget draws a title row in its panel when the
 * widget declares a title of its own (board DqZaakDocumenten: tab
 * "Documenten", panel "Documenten bij dit verzoek" with its line under it).
 * A title the tab already shows is not repeated.
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const DUTCH = { Documents: 'Documenten', 'Documents for this request': 'Documenten bij dit verzoek', 'Review each document.': 'Per document beoordelen.' }

/**
 * @param {Array<object>} widgets The available widgets.
 * @param {Array<object>} tabs The tabs.
 * @return {object} The wrapper.
 */
function mountTabs(widgets, tabs) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: widgets },
		global: {
			provide: { cnTranslate: (s) => DUTCH[s] || s },
			stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' } },
		},
	})
}

describe('CnTabsWidget single-widget panel title', () => {
	it('draws the widget title and description as the panel title row', async () => {
		const w = mountTabs(
			[{ id: 'w-files', type: 'files', title: 'Documents for this request', description: 'Review each document.' }],
			[{ id: 'docs', label: 'Documents', widgetId: 'w-files' }],
		)
		await nextTick()
		const row = w.find('[data-testid="cn-tabs-widget-panel-heading"]')
		expect(row.find('h2').text()).toBe('Documenten bij dit verzoek')
		expect(row.find('.cn-tabs-widget__panel-subtitle').text()).toBe('Per document beoordelen.')
	})

	it('draws none when the widget has no title, or the tab already shows it', async () => {
		for (const [widgets, tabs] of [
			[[{ id: 'w', type: 'files' }], [{ id: 'docs', label: 'Documents', widgetId: 'w' }]],
			[[{ id: 'w', type: 'files', title: 'Documents' }], [{ id: 'docs', label: 'Documents', widgetId: 'w' }]],
			[[{ id: 'w', type: 'files', title: 'Documents' }], ['w']],
		]) {
			const w = mountTabs(widgets, tabs)
			await nextTick()
			expect(w.find('.host').exists()).toBe(true)
			expect(w.find('[data-testid="cn-tabs-widget-panel-heading"]').exists()).toBe(false)
		}
	})
})
