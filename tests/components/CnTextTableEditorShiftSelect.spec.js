/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Shift+click on a cell input extends the selection. The browser fires
 * mousedown, then focus (which carries no modifier keys), then click; the
 * focus must not reset the anchor, or Merge cells never enables.
 */
import { mount } from '@vue/test-utils'
import CnTextTableEditor from '@/components/CnTextTableEditor/CnTextTableEditor.vue'

const cell = (text = '') => ({ text, rowSpan: 1, colSpan: 1 })
const value = { headerRow: false, columnAlignments: ['left', 'left'], rows: [[cell('a'), cell('b')], [cell('c'), cell('d')]] }

async function press(input, shiftKey) {
	await input.trigger('mousedown', { shiftKey })
	await input.trigger('focus')
	await input.trigger('click', { shiftKey })
}

describe('CnTextTableEditor Shift+click selection', () => {
	it('keeps the anchor and extends to the Shift+clicked cell', async () => {
		const wrapper = mount(CnTextTableEditor, { propsData: { value } })
		const inputs = wrapper.findAll('.cn-text-table-editor__input')
		await press(inputs.at(0), false)
		await press(inputs.at(3), true)
		expect(wrapper.vm.anchor).toEqual({ rIdx: 0, cIdx: 0 })
		expect(wrapper.vm.extent).toEqual({ rIdx: 1, cIdx: 1 })
		expect(wrapper.vm.canMerge).toBe(true)
	})

	it('a plain click or keyboard focus still sets a new anchor', async () => {
		const wrapper = mount(CnTextTableEditor, { propsData: { value } })
		const inputs = wrapper.findAll('.cn-text-table-editor__input')
		await press(inputs.at(0), false)
		await press(inputs.at(1), true)
		await inputs.at(2).trigger('focus')
		expect(wrapper.vm.anchor).toEqual({ rIdx: 1, cIdx: 0 })
		expect(wrapper.vm.canMerge).toBe(false)
		await press(inputs.at(3), false)
		expect(wrapper.vm.anchor).toEqual({ rIdx: 1, cIdx: 1 })
		expect(wrapper.vm.canMerge).toBe(false)
	})
})
