/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Verifies CnDashboardPage renders CnActionButtons from its declarative
 * `headerActions` prop (#91 Wave 3) — the surface CnPageRenderer fills
 * from pages[].config.headerActions.
 */

import { shallowMount } from '@vue/test-utils'
import CnDashboardPage from '../../src/components/CnDashboardPage/CnDashboardPage.vue'

function mountDash(propsData = {}) {
	return shallowMount(CnDashboardPage, {
		propsData,
		stubs: {
			CnActionButtons: { name: 'CnActionButtons', props: ['actions'], template: '<div class="action-buttons-stub" />' },
		},
	})
}

describe('CnDashboardPage — headerActions (#91 Wave 3)', () => {
	it('renders CnActionButtons with the declarative headerActions', () => {
		const headerActions = [
			{ id: 'new-lead', label: 'New lead', type: 'open-form', schema: 'lead' },
		]
		const wrapper = mountDash({ title: 'Dash', headerActions })
		const surface = wrapper.findComponent({ name: 'CnActionButtons' })
		expect(surface.exists()).toBe(true)
		expect(surface.props('actions')).toEqual(headerActions)
	})

	it('does not render the surface when headerActions is empty (additive default)', () => {
		const wrapper = mountDash({ title: 'Dash' })
		expect(wrapper.findComponent({ name: 'CnActionButtons' }).exists()).toBe(false)
	})
})
