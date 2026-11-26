/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWidgetEditCog draws a cog by default and the three-dot kebab when asked
 * (LpBewerken).
 */
import { mount } from '@vue/test-utils'
import CnWidgetEditCog from '@/components/CnWidgetEditCog/CnWidgetEditCog.vue'

describe('CnWidgetEditCog icon', () => {
	it('draws a cog by default', () => {
		const wrapper = mount(CnWidgetEditCog)
		expect(wrapper.findComponent({ name: 'CogIcon' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'DotsVerticalIcon' }).exists()).toBe(false)
	})

	it('draws the kebab with icon="kebab"', () => {
		const wrapper = mount(CnWidgetEditCog, { propsData: { icon: 'kebab' } })
		expect(wrapper.findComponent({ name: 'DotsVerticalIcon' }).exists()).toBe(true)
		expect(wrapper.findComponent({ name: 'CogIcon' }).exists()).toBe(false)
	})
})
