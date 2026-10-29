/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An integration widget hands its leaf `labels` in the host's language.
 *
 * @spec openspec/changes/leaf-labels-in-the-host-language/specs/leaf-labels-in-the-host-language/spec.md#requirement-an-integration-widget-gives-its-leaf-labels-in-the-hosts-language
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { contactsIntegration } from '../../src/integrations/builtin/contacts.js'
import { integrations } from '../../src/integrations/registry.js'

const NL = { 'Create a proposal for this ticket': 'Voorstel maken voor dit ticket' }

/**
 * Mount the host on a contacts integration widget.
 *
 * @param {object} widget The widget definition.
 * @return {object} The wrapper.
 */
function mountHost(widget) {
	return mount(CnDetailWidgetHost, {
		props: {
			widget: { id: 'w', type: 'integration', integrationId: 'contacts', ...widget },
			chrome: 'card',
			surface: 'detail-page',
			objectId: 'ticket-1',
			register: 'pipelinq',
			schema: 'ticket',
		},
		global: {
			provide: { cnTranslate: (key) => NL[key] || key },
			stubs: { CnIcon: true, CnContactsCard: { name: 'CnContactsCard', props: ['title', 'createLabel'], template: '<div />' } },
		},
	})
}

describe('CnDetailWidgetHost: a leaf gets labels in the host language', () => {
	beforeEach(() => integrations.register({ ...contactsIntegration, requiredApp: null }))
	afterEach(() => integrations.__resetForTests())

	it('translates each label and hands it to a component leaf and a mount-mode leaf', () => {
		const w = mountHost({ labels: { createLabel: 'Create a proposal for this ticket', ignored: 3 } })
		expect(w.findComponent({ name: 'CnContactsCard' }).props('createLabel')).toBe('Voorstel maken voor dit ticket')
		expect(w.vm.integrationMountProps.createLabel).toBe('Voorstel maken voor dit ticket')
		expect(w.vm.integrationMountProps).not.toHaveProperty('ignored')
		w.unmount()
	})

	it('lets a props entry of the same name win', () => {
		const w = mountHost({ labels: { createLabel: 'Create a proposal for this ticket' }, props: { createLabel: 'As given' } })
		expect(w.vm.integrationProps.createLabel).toBe('As given')
		expect(w.vm.integrationMountProps.createLabel).toBe('As given')
		w.unmount()
	})
})
