/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An integration leaf on a detail page carries the manifest's widget title,
 * translated, whichever prop the leaf names its title by: `title` (most
 * cards) or `titleLabel` (contacts, notes, tasks, contact moments). The
 * contacts card printed its own English "Contacts" where the manifest titles
 * the widget "Parties" (DqZaakBetrokkenen "Partijen").
 *
 * @spec openspec/changes/leaf-card-widget-title/specs/leaf-card-widget-title/spec.md#requirement-a-leaf-card-carries-the-widgets-title
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { contactsIntegration } from '../../src/integrations/builtin/contacts.js'
import { integrations } from '../../src/integrations/registry.js'

const NL = { Parties: 'Partijen' }

/**
 * Mount the host on a contacts integration widget.
 *
 * @param {object} widget The widget definition.
 * @return {object} The wrapper.
 */
function mountHost(widget) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'case-parties', type: 'integration', integrationId: 'contacts', ...widget },
			chrome: 'card',
			surface: 'detail-page',
			objectId: 'case-1',
			register: 'dossiq',
			schema: 'case',
		},
		global: {
			provide: { cnTranslate: (key) => NL[key] || key },
			stubs: { CnIcon: true, CnContactsCard: { name: 'CnContactsCard', props: ['title', 'titleLabel'], template: '<div class="contacts-stub" />' } },
		},
	})
}

describe('CnDetailWidgetHost: a leaf carries the widget title', () => {
	beforeEach(() => integrations.register({ ...contactsIntegration, requiredApp: null }))
	afterEach(() => integrations.__resetForTests())

	it('hands the translated widget title to a leaf that names it titleLabel', () => {
		const w = mountHost({ title: 'Parties' })
		const card = w.findComponent({ name: 'CnContactsCard' })
		expect(card.exists()).toBe(true)
		expect(card.props('titleLabel')).toBe('Partijen')
		expect(card.props('title')).toBe('Partijen')
		w.unmount()
	})

	it('leaves the leaf its own title when the widget has none', () => {
		const w = mountHost({})
		expect(w.findComponent({ name: 'CnContactsCard' }).props('titleLabel')).toBeUndefined()
		w.unmount()
	})

	it('hands a mount-mode leaf the same title', () => {
		const w = mountHost({ title: 'Parties' })
		expect(w.vm.integrationMountProps.title).toBe('Partijen')
		w.unmount()
	})
})
