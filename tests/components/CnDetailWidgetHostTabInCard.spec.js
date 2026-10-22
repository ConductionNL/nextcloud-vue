/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An integration widget with `content.view: "tab"` shows the leaf's full tab
 * (the people grouped by role, with Link contact and New contact) inside a
 * titled card, instead of the compact count card. DqZaakBetrokkenen draws
 * "Partijen" that way, with a muted line under the title.
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { contactsIntegration } from '../../src/integrations/builtin/contacts.js'
import { integrations } from '../../src/integrations/registry.js'

const NL = { 'Case parties': 'Partijen', 'Everyone involved in this case, by role': 'Iedereen die bij deze zaak betrokken is, per rol' }

function mountHost(widget) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'case-parties-card', type: 'integration', integrationId: 'contacts', title: 'Case parties', ...widget },
			chrome: 'card',
			surface: 'detail-page',
			objectId: 'case-1',
			register: 'dossiq',
			schema: 'case',
		},
		global: {
			provide: { cnTranslate: (key) => NL[key] || key },
			stubs: {
				CnIcon: true,
				CnContactsCard: { name: 'CnContactsCard', template: '<div class="contacts-card-stub" />' },
				CnContactsTab: { name: 'CnContactsTab', props: ['objectId', 'register', 'schema'], template: '<div class="contacts-tab-stub" />' },
			},
		},
	})
}

describe('CnDetailWidgetHost: an integration tab inside a card', () => {
	beforeEach(() => integrations.register({ ...contactsIntegration, requiredApp: null }))
	afterEach(() => integrations.__resetForTests())

	it('draws the leaf\'s tab in a card titled and subtitled by the widget', () => {
		const w = mountHost({ subtitle: 'Everyone involved in this case, by role', content: { view: 'tab' } })
		const card = w.find('[data-testid="cn-detail-widget-tab-card"]')
		expect(card.exists()).toBe(true)
		expect(card.text()).toContain('Partijen')
		expect(w.find('[data-testid="cn-widget-wrapper-subtitle"]').text()).toBe('Iedereen die bij deze zaak betrokken is, per rol')
		const tab = w.findComponent({ name: 'CnContactsTab' })
		expect(tab.exists()).toBe(true)
		expect(tab.props('objectId')).toBe('case-1')
		expect(w.findComponent({ name: 'CnContactsCard' }).exists()).toBe(false)
		w.unmount()
	})

	it('keeps the compact card without the switch', () => {
		const w = mountHost({})
		expect(w.find('[data-testid="cn-detail-widget-tab-card"]').exists()).toBe(false)
		expect(w.findComponent({ name: 'CnContactsCard' }).exists()).toBe(true)
		w.unmount()
	})
})
