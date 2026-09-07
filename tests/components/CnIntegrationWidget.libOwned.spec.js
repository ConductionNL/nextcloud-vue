/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIntegrationWidget — lib-owned leaves resolve to this bundle's component.
 *
 * Same defect as CnDetailWidgetHost.libOwned.spec.js: the widget rendered
 * `provider.tab` straight off the registry entry, so a lib-owned id that
 * OpenRegister's bundle registered rendered under the wrong Vue and its nested
 * `NcButton`s reached the DOM as literal `<ncbutton>` elements.
 */
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnIntegrationWidget from '../../src/components/CnIntegrationWidget/CnIntegrationWidget.vue'
import { createIntegrationRegistry } from '../../src/integrations/registry.js'

const ForeignLeaf = {
	name: 'ForeignLeaf',
	render() {
		return h('div', { class: 'foreign-leaf' }, [h('ncbutton', 'Add contact')])
	},
}
const CustomLeaf = { name: 'CustomLeaf', render() { return h('div', { class: 'custom-leaf' }) } }

function mountWidget(registry, props = {}) {
	return mount(CnIntegrationWidget, {
		props: { registry, register: 'dossiq', schema: 'case', objectId: 'obj-1', ...props },
		global: { stubs: { CnIcon: true, CnContactsTab: true, CnActionsMenu: true } },
	})
}

describe('CnIntegrationWidget — lib-owned leaves', () => {
	it('single mode renders the lib tab for a lib-owned id, not the stored foreign one', () => {
		const registry = createIntegrationRegistry()
		registry.register({ id: 'contacts', label: 'Contacts', requiredApp: null, tab: ForeignLeaf, widget: ForeignLeaf, __libOwned: true })
		const w = mountWidget(registry, { only: 'contacts' })
		expect(w.findComponent({ name: 'CnContactsTab' }).exists()).toBe(true)
		expect(w.find('.foreign-leaf').exists()).toBe(false)
		expect(w.html()).not.toMatch(/<ncbutton/i)
		w.unmount()
	})

	it('tabbed mode renders the lib tab for the active lib-owned id', () => {
		const registry = createIntegrationRegistry()
		registry.register({ id: 'contacts', label: 'Contacts', requiredApp: null, tab: ForeignLeaf, widget: ForeignLeaf, __libOwned: true })
		const w = mountWidget(registry)
		expect(w.findComponent({ name: 'CnContactsTab' }).exists()).toBe(true)
		expect(w.html()).not.toMatch(/<ncbutton/i)
		w.unmount()
	})

	it('negative control: a consumer-custom id keeps its stored component', () => {
		const registry = createIntegrationRegistry()
		registry.register({ id: 'my-leaf', label: 'Mine', requiredApp: null, tab: CustomLeaf, widget: CustomLeaf })
		const w = mountWidget(registry, { only: 'my-leaf' })
		expect(w.find('.custom-leaf').exists()).toBe(true)
		w.unmount()
	})
})
