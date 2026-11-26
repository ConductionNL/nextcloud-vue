/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNcWidgetGridPicker's roving tabindex follows the focused card.
 */
import { mount } from '@vue/test-utils'
import CnNcWidgetGridPicker from '@/components/CnNcWidgetGridPicker/CnNcWidgetGridPicker.vue'

const WIDGETS = [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }, { id: 'c', title: 'Gamma' }]

/**
 * The tabindex of every card, in order.
 *
 * @param {object} wrapper The wrapper.
 * @return {string[]} The tabindex values.
 */
function tabindexes(wrapper) {
	return wrapper.findAll('.cn-nc-widget-grid-picker__card').map((c) => c.attributes('tabindex'))
}

describe('CnNcWidgetGridPicker roving tabindex', () => {
	it('moves tabindex 0 with ArrowRight and ArrowLeft', async () => {
		const wrapper = mount(CnNcWidgetGridPicker, { attachTo: document.body, propsData: { widgets: WIDGETS } })
		expect(tabindexes(wrapper)).toEqual(['0', '-1', '-1'])
		const cards = wrapper.findAll('.cn-nc-widget-grid-picker__card')
		await cards[0].trigger('keydown', { key: 'ArrowRight' })
		await wrapper.vm.$nextTick()
		expect(tabindexes(wrapper)).toEqual(['-1', '0', '-1'])
		expect(document.activeElement).toBe(cards[1].element)
		await cards[1].trigger('keydown', { key: 'ArrowLeft' })
		expect(tabindexes(wrapper)).toEqual(['0', '-1', '-1'])
		wrapper.unmount()
	})

	it('starts on the selected card, then follows focus away from it', async () => {
		const wrapper = mount(CnNcWidgetGridPicker, { propsData: { widgets: WIDGETS, value: 'c' } })
		expect(tabindexes(wrapper)).toEqual(['-1', '-1', '0'])
		await wrapper.findAll('.cn-nc-widget-grid-picker__card')[2].trigger('keydown', { key: 'Home' })
		expect(tabindexes(wrapper)).toEqual(['0', '-1', '-1'])
	})
})
