/**
 * Tests for CnColorPicker's public event contract.
 *
 * Regression: picking a colour did nothing — no preview update, nothing saved.
 * `@ckpack/vue-color` emits `update:modelValue`, never `input`, so a
 * consumer's `@input` listener (forwarded through `$attrs`) was never called.
 * Every widget form in the library binds `@input="...$event.hex"`, so the
 * whole colour-picking surface was inert.
 */

import { mount } from '@vue/test-utils'
import CnColorPicker from '../../src/components/CnColorPicker/CnColorPicker.vue'

const COLOR = { hex: '#AABBCC', hex8: '#AABBCCFF', rgba: { r: 170, g: 187, b: 204, a: 1 } }

const NcPopoverStub = {
	name: 'NcPopover',
	template: '<div class="popover"><slot name="trigger" /><slot /></div>',
}
const ChromeStub = {
	name: 'Chrome',
	props: { modelValue: { type: [String, Object], default: '' } },
	template: '<div class="chrome-stub" />',
}

function mountPicker(props = {}, listeners = {}) {
	return mount(CnColorPicker, {
		propsData: { value: '#000000', ...props, ...listeners },
		global: { stubs: { NcPopover: NcPopoverStub, Chrome: ChromeStub } },
	})
}

describe('CnColorPicker', () => {
	it('emits input with the colour object when a colour is picked', async () => {
		const wrapper = mountPicker()
		wrapper.findComponent(ChromeStub).vm.$emit('update:modelValue', COLOR)
		await wrapper.vm.$nextTick()

		const emitted = wrapper.emitted('input')
		expect(emitted).toHaveLength(1)
		// Consumers bind `$event.hex` / `$event.hex8`; the whole object passes through.
		expect(emitted[0][0]).toEqual(COLOR)
	})

	it('declares input so the listener never falls through to the Chrome picker', () => {
		const onInput = jest.fn()
		const wrapper = mountPicker({}, { onInput })
		// A declared emit is stripped from $attrs — otherwise it would be
		// forwarded to a component that never fires it.
		expect(wrapper.findComponent(ChromeStub).attributes('oninput')).toBeUndefined()

		wrapper.findComponent(ChromeStub).vm.$emit('update:modelValue', COLOR)
		expect(onInput).toHaveBeenCalledWith(COLOR)
	})

	it('still emits clear with no payload', async () => {
		const wrapper = mountPicker({ clearable: true })
		await wrapper.find('.cn-color-picker__clear').trigger('click')
		expect(wrapper.emitted('clear')).toHaveLength(1)
		expect(wrapper.emitted('clear')[0]).toEqual([])
	})
})
