/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A new header offers the height preset that sets its starting height
 * (REQ-HDR-009): small, medium, large, extra large, medium by default. An
 * edited header is resized on the grid, so the control is not offered there.
 */
import { mount } from '@vue/test-utils'
import CnHeaderWidgetForm from '@/components/CnHeaderWidgetForm/CnHeaderWidgetForm.vue'

function heightSelect(wrapper) {
	return wrapper.findAllComponents({ name: 'NcSelect' })
		.find((select) => select.vm.$attrs.inputLabel === 'Height')
}

describe('CnHeaderWidgetForm height preset', () => {
	it('offers the four presets in order, medium by default', () => {
		const wrapper = mount(CnHeaderWidgetForm)
		const select = heightSelect(wrapper)
		expect(select).toBeTruthy()
		expect(select.vm.$attrs.options.map((o) => o.value)).toEqual(['small', 'medium', 'large', 'xlarge'])
		expect(select.vm.$attrs.modelValue).toBe('medium')
	})

	it('stores the chosen preset in the content', async () => {
		const wrapper = mount(CnHeaderWidgetForm)
		heightSelect(wrapper).vm.$attrs['onUpdate:modelValue']('small')
		await wrapper.vm.$nextTick()
		const events = wrapper.emitted('update:content')
		expect(events[events.length - 1][0].height).toBe('small')
	})

	it('is not offered when editing a placed header', () => {
		const wrapper = mount(CnHeaderWidgetForm, { propsData: { editingWidget: { content: { title: 'x', height: 'large' } } } })
		expect(heightSelect(wrapper)).toBeUndefined()
	})
})
