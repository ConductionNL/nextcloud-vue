/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The overflow Actions menu's name was a bare `menu-name="Actions"` literal in
 * the template. On a Dutch instance it rendered "Actions" beside a fully
 * translated toolbar — while the library catalogue had carried "Acties" the
 * whole time. Nothing was missing; the string simply never asked.
 *
 * A literal in a template is invisible to every catalogue check there is, so
 * this spec asserts on the rendered prop rather than on a catalogue file.
 */

import { mount } from '@vue/test-utils'

import CnActionsBar from '@/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcButton: { template: '<button><slot /></button>' },
	NcActions: {
		name: 'NcActions',
		props: ['menuName', 'forceName', 'inline'],
		template: '<div class="stub-actions" :data-menu-name="menuName"><slot /></div>',
	},
	NcActionButton: true,
	NcActionLink: true,
	NcActionSeparator: true,
	NcLoadingIcon: true,
	NcSelect: true,
	CnActionsMenu: true,
}

describe('CnActionsBar — the overflow menu name', () => {
	it('resolves through the library catalogue rather than being a template literal', () => {
		const wrapper = mount(CnActionsBar, { propsData: {}, stubs })
		const actions = wrapper.find('[data-testid="cn-actions"], .stub-actions')

		// With no catalogue registered in the test environment, `t()` returns the
		// English source — the point is that a translator is CONSULTED at all, so
		// a registered Dutch catalogue can answer.
		expect(actions.attributes('data-menu-name')).toBe('Actions')
		// The name comes from a computed, not the template — that is what makes
		// it reachable by a catalogue at all.
		expect(wrapper.vm.actionsMenuName).toBe('Actions')
		wrapper.unmount()
	})
})
