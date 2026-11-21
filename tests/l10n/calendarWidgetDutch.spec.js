/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The calendar widget in Dutch (launchpad calendar-widget::empty-state-for-no-events
 * read "No events in the next 7 days" for a Dutch user). Runs the real @nextcloud/l10n.
 */

import { mount } from '@vue/test-utils'
import CnCalendarWidget from '../../src/components/CnCalendarWidget/CnCalendarWidget.vue'
import { registerTranslations } from '../../src/l10n/index.js'

describe('calendar widget in Dutch', () => {
	beforeEach(() => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
	})

	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('names the empty window and the failed sources in Dutch', async () => {
		const dataSource = { fetchEvents: jest.fn().mockResolvedValue({ events: [], failures: ['a', 'b'] }) }
		const wrapper = mount(CnCalendarWidget, { propsData: { content: { daysAhead: 7 }, dataSource } })
		await Promise.resolve()
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.find('.cn-calendar-widget__state').text()).toBe('Geen afspraken in de komende 7 dagen')
		expect(wrapper.find('.cn-calendar-widget__notice').text()).toContain('2 agendabronnen niet beschikbaar')
		expect(wrapper.findAll('.cn-calendar-widget__mode-btn').map((b) => b.text())).toEqual(['Maand', 'Week', 'Agenda'])
	})
})
