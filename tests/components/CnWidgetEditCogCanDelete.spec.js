/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnWidgetEditCog leaves Delete out when canDelete is false.
 */
import { mount } from '@vue/test-utils'
import CnWidgetEditCog from '@/components/CnWidgetEditCog/CnWidgetEditCog.vue'

describe('CnWidgetEditCog canDelete', () => {
	it('offers Delete by default', () => {
		const wrapper = mount(CnWidgetEditCog)
		expect(wrapper.find('[data-testid="cn-widget-edit-cog-delete"]').exists()).toBe(true)
	})

	it('leaves Delete out and keeps Edit when canDelete is false', () => {
		const wrapper = mount(CnWidgetEditCog, { propsData: { canDelete: false } })
		expect(wrapper.find('[data-testid="cn-widget-edit-cog-delete"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-widget-edit-cog-edit"]').exists()).toBe(true)
	})
})
