/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `trailingChevron` swaps the trigger's dots for a 14px chevron, the board's
 * "Meer" menu in a detail header (DqZaak). Without it the dots stay.
 */
import { mount } from '@vue/test-utils'
import CnActionsMenu from '../../src/components/CnActionsMenu/CnActionsMenu.vue'

const NcActions = { name: 'NcActions', template: '<div><slot name="icon" /><slot /></div>' }

/**
 * Mount the menu with the given props.
 *
 * @param {object} props Extra props.
 * @return {object} The wrapper.
 */
function mountMenu(props = {}) {
	return mount(CnActionsMenu, {
		propsData: { widgetId: 'w1', title: 'Zaak', surface: 'detail:w1', variant: 'secondary', ...props },
		stubs: { NcActions, NcActionButton: true, NcActionLink: true, NcActionSeparator: true },
		mocks: { $route: { name: 'Dashboard' } },
		provide: { cnAppId: 'dossiq', cnFeatureRequestRepo: 'ConductionNL/dossiq' },
	})
}

describe('CnActionsMenu trailingChevron', () => {
	it('draws the chevron and no dots when asked', () => {
		const w = mountMenu({ trailingChevron: true })
		expect(w.findComponent({ name: 'ChevronDownIcon' }).exists()).toBe(true)
		expect(w.findComponent({ name: 'DotsHorizontalIcon' }).exists()).toBe(false)
	})

	it('keeps the dots by default', () => {
		const w = mountMenu()
		expect(w.findComponent({ name: 'DotsHorizontalIcon' }).exists()).toBe(true)
		expect(w.findComponent({ name: 'ChevronDownIcon' }).exists()).toBe(false)
	})
})
