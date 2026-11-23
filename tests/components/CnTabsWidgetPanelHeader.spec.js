/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A single-widget tab with `showTitle` draws what its widget reports for the
 * title row: the counts line and the actions (board PqTicketContactmomenten:
 * "Contactmomenten", "2 bij dit ticket, nieuwste eerst", "Contact vastleggen").
 * With those the heading shows even when it repeats the tab label.
 *
 * @spec openspec/changes/list-add-in-panel-heading/specs/object-list/spec.md#requirement-a-tab-panel-heading-carries-what-its-widget-reports
 */
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

const Host = { name: 'CnDetailWidgetHost', props: ['widget'], emits: ['panel-header'], template: '<div class="host">{{ widget.id }}</div>' }

function mountTabs(tab) {
	return mount(CnTabsWidget, {
		props: {
			content: { tabs: [tab] },
			availableWidgets: [{ id: 'moments', type: 'object-list', title: 'Contact moments' }],
		},
		global: {
			provide: { cnTranslate: (s) => ({ 'Contact moments': 'Contactmomenten' }[s] || s) },
			stubs: { CnDetailWidgetHost: Host },
		},
	})
}

describe('CnTabsWidget panel heading from the widget', () => {
	it('draws the reported counts line and Add beside the title, even when the tab shows the same title', async () => {
		const w = mountTabs({ label: 'Contact moments', widgetId: 'moments', showTitle: true })
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-panel-heading"]').exists()).toBe(false)
		const run = jest.fn()
		w.findComponent(Host).vm.$emit('panel-header', { subtitle: '2 bij dit ticket, nieuwste eerst', actions: [{ label: 'Contact vastleggen', icon: 'Phone', add: true, variant: 'secondary', run }] })
		await nextTick()
		const row = w.find('[data-testid="cn-tabs-widget-panel-heading"]')
		expect(row.find('h2').text()).toBe('Contactmomenten')
		expect(row.find('.cn-tabs-widget__panel-subtitle').text()).toBe('2 bij dit ticket, nieuwste eerst')
		const button = row.find('[data-testid="cn-widget-header-action"]')
		expect(button.text()).toContain('Contact vastleggen')
		await button.trigger('click')
		expect(run).toHaveBeenCalled()
	})

	it('ignores a report without showTitle', async () => {
		const w = mountTabs({ label: 'Contact moments', widgetId: 'moments' })
		await nextTick()
		w.findComponent(Host).vm.$emit('panel-header', { subtitle: '2 bij dit ticket', actions: [] })
		await nextTick()
		expect(w.find('[data-testid="cn-tabs-widget-panel-heading"]').exists()).toBe(false)
	})
})
