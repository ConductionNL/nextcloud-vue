/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab that holds a single widget draws a title row in its panel when the
 * widget declares a title and a description of its own (board
 * DqZaakDocumenten: tab "Documenten", panel "Documenten bij dit verzoek" with
 * its line under it). A title the tab already shows is not repeated, and a
 * title without a description draws nothing, unless the tab asks for it with
 * `showTitle: true` (board PqMailinglijst: tab "Overzicht", panel
 * "Lijstgegevens" with no line under it).
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const DUTCH = { 'List details': 'Lijstgegevens', Overview: 'Overzicht', Documents: 'Documenten', 'Documents for this request': 'Documenten bij dit verzoek', 'Review each document.': 'Per document beoordelen.' }

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

	it('draws none when the widget has no title or no description, or the tab already shows it', async () => {
		for (const [widgets, tabs] of [
			[[{ id: 'w', type: 'files', description: 'Review each document.' }], [{ id: 'docs', label: 'Documents', widgetId: 'w' }]],
			[[{ id: 'w', type: 'files', title: 'Documents for this request' }], [{ id: 'docs', label: 'Documents', widgetId: 'w' }]],
			[[{ id: 'w', type: 'files', title: 'Documents', description: 'Review each document.' }], [{ id: 'docs', label: 'Documents', widgetId: 'w' }]],
			[[{ id: 'w', type: 'files', title: 'Documents', description: 'Review each document.' }], ['w']],
		]) {
			const w = mountTabs(widgets, tabs)
			await nextTick()
			expect(w.find('.host').exists()).toBe(true)
			expect(w.find('[data-testid="cn-tabs-widget-panel-heading"]').exists()).toBe(false)
		}
	})

	it('draws the widget title alone when the tab sets showTitle', async () => {
		const w = mountTabs(
			[{ id: 'list-data', type: 'data', title: 'List details' }],
			[{ id: 'overview', label: 'Overview', widgetId: 'list-data', showTitle: true }],
		)
		await nextTick()
		const row = w.find('[data-testid="cn-tabs-widget-panel-heading"]')
		expect(row.exists()).toBe(true)
		expect(row.find('h2').text()).toBe('Lijstgegevens')
		expect(row.find('.cn-tabs-widget__panel-subtitle').exists()).toBe(false)
	})

	it('keeps the subtitle under a showTitle heading when the widget has a description', async () => {
		const w = mountTabs(
			[{ id: 'list-data', type: 'data', title: 'List details', description: 'Review each document.' }],
			[{ id: 'overview', label: 'Overview', widgetId: 'list-data', showTitle: true }],
		)
		await nextTick()
		expect(w.find('.cn-tabs-widget__panel-subtitle').text()).toBe('Per document beoordelen.')
	})

	it('does not repeat the tab label under showTitle', async () => {
		const w = mountTabs(
			[{ id: 'list-data', type: 'data', title: 'Overview' }],
			[{ id: 'overview', label: 'Overview', widgetId: 'list-data', showTitle: true }],
		)
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-panel-heading"]').exists()).toBe(false)
	})
})
