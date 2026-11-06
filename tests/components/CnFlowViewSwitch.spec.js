/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 */
import { mount } from '@vue/test-utils'
import CnFlowViewSwitch from '../../src/components/CnFlowDetail/CnFlowViewSwitch.vue'

describe('CnFlowViewSwitch', () => {
	it('marks the view on screen', () => {
		const wrapper = mount(CnFlowViewSwitch, { props: { modelValue: 'list' } })

		expect(wrapper.find('[data-testid="flow-view-list"]').attributes('aria-pressed')).toBe('true')
		expect(wrapper.find('[data-testid="flow-view-canvas"]').attributes('aria-pressed')).toBe('false')
	})

	it('reports the other view', async () => {
		const wrapper = mount(CnFlowViewSwitch)

		await wrapper.find('[data-testid="flow-view-list"]').trigger('click')

		expect(wrapper.emitted('update:modelValue')).toEqual([['list']])
	})

	it('says it is the same flow only when asked, per view', async () => {
		const wrapper = mount(CnFlowViewSwitch, { props: { note: true } })
		const canvasNote = wrapper.find('[data-testid="flow-view-note"]').text()

		await wrapper.setProps({ modelValue: 'list' })

		expect(wrapper.find('[data-testid="flow-view-note"]').text()).not.toBe(canvasNote)
		expect(mount(CnFlowViewSwitch).find('[data-testid="flow-view-note"]').exists()).toBe(false)
	})
})
