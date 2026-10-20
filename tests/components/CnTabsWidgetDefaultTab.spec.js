/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A tab marked `default: true` is the one the strip opens on, so a page can
 * keep its Overview tab first and still open on another tab (decidiq boards
 * DcVergadering: Overzicht first, opened on Agenda; DcAmendement: opened on
 * Tekstwijzigingen). A route hash naming a tab still wins, and a default tab
 * under More or still pending is not opened.
 */
import { mount } from '@vue/test-utils'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const WIDGETS = [
	{ id: 'w-overview', type: 'data', title: 'Overview' },
	{ id: 'w-agenda', type: 'custom', title: 'Agenda' },
	{ id: 'w-people', type: 'custom', title: 'Participants' },
	{ id: 'w-stage', type: 'custom', title: 'Stage' },
]

/**
 * @param {Array} tabs The `content.tabs`.
 * @return {object} The wrapper.
 */
function mountTabs(tabs) {
	return mount(CnTabsWidget, {
		props: { content: { tabs }, availableWidgets: WIDGETS, objectData: { id: 'm1', state: 'open' } },
		global: {
			stubs: { CnDetailWidgetHost: { name: 'CnDetailWidgetHost', props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' } },
		},
	})
}

describe('CnTabsWidget default tab', () => {
	afterEach(() => {
		window.history.replaceState(null, '', window.location.pathname)
	})

	it('opens on the tab marked default', () => {
		const w = mountTabs([
			{ widgetId: 'w-overview', label: 'Overview' },
			{ widgetId: 'w-agenda', label: 'Agenda', default: true },
			{ widgetId: 'w-people', label: 'Participants' },
		])
		expect(w.vm.activeTab.widgetId).toBe('w-agenda')
	})

	it('opens on the first tab when none is marked', () => {
		const w = mountTabs([
			{ widgetId: 'w-overview', label: 'Overview' },
			{ widgetId: 'w-agenda', label: 'Agenda' },
		])
		expect(w.vm.activeTab.widgetId).toBe('w-overview')
	})

	it('does not open a default tab that sits under More', () => {
		const w = mountTabs([
			{ widgetId: 'w-overview', label: 'Overview' },
			{ widgetId: 'w-stage', label: 'Stage', overflow: true, default: true },
		])
		expect(w.vm.activeTab.widgetId).toBe('w-overview')
	})

	it('lets a route hash naming a tab win over the default', () => {
		window.history.replaceState(null, '', `${window.location.pathname}#people`)
		const w = mountTabs([
			{ widgetId: 'w-overview', label: 'Overview' },
			{ widgetId: 'w-agenda', label: 'Agenda', default: true },
			{ id: 'people', widgetId: 'w-people', label: 'Participants' },
		])
		expect(w.vm.activeTab.widgetId).toBe('w-people')
	})
})
